import { supabaseBrowser } from './supabaseBrowser'

export const supabase = supabaseBrowser as typeof supabaseBrowser

// Alias for admin usage (client-side; still respects RLS)
export const supabaseAdmin = supabaseBrowser as typeof supabaseBrowser

export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser()
  return { user: data.user ?? null, error }
}

export const getNotifications = async (
  recipientId?: string,
  options?: { status?: string; type?: string; limit?: number; offset?: number; search?: string }
) => {
  let query = supabase.from('notifications').select('*', { count: 'exact' })

  if (recipientId) query = query.eq('recipient_id', recipientId)
  if (options?.status) query = query.eq('status', options.status)
  if (options?.type) query = query.eq('type', options.type)
  if (options?.search) {
    const q = options.search.replace(/%/g, '\\%').replace(/_/g, '\\_')
    query = query.or(`content.ilike.%${q}%,id.ilike.%${q}%`)
  }
  if (options?.limit) {
    const offset = options?.offset ?? 0
    query = query.range(offset, offset + options.limit - 1)
  }

  const { data, error, count } = await query.order('created_at', { ascending: false })
  return { notifications: data ?? [], count: count ?? 0, error }
}

export const createNotification = async (payload: {
  recipient_id: string
  type: 'info' | 'success' | 'warning' | 'error'
  content: string
  status: 'read' | 'unread'
  read_at: string | null
}) => {
  const { data, error } = await supabase
    .from('notifications')
    .insert(payload)
    .select()
    .single()
  return { notification: data ?? null, error }
}

export const updateNotification = async (
  id: string,
  updates: Partial<{ status: string; read_at: string | null }>
) => {
  const { data, error } = await supabase
    .from('notifications')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return { notification: data ?? null, error }
}

export const getUsers = async () => {
  const { data, error } = await supabase.from('users').select('*')
  return { users: data ?? [], error }
}

export const getTransactionHistory = async (options?: {
  type?: string
  limit?: number
  offset?: number
  search?: string
}) => {
  let query = supabase
    .from('wallet_transactions')
    .select('id, user_id, type, amount, status, created_at', { count: 'exact' })

  if (options?.type) query = query.eq('type', options.type)
  if (options?.search) {
    const q = options.search.replace(/%/g, '\\%').replace(/_/g, '\\_')
    query = query.or(`id.ilike.%${q}%,user_id.ilike.%${q}%`)
  }
  if (options?.limit) {
    const offset = options?.offset ?? 0
    query = query.range(offset, offset + options.limit - 1)
  }

  const { data, error, count } = await query.order('created_at', { ascending: false })
  return { transactions: data ?? [], count: count ?? 0, error }
}

export const getWithdrawalRequests = async (options?: { status?: string; limit?: number }) => {
  let query = supabase.from('withdraw_requests').select('*')

  if (options?.status) query = query.eq('status', options.status)
  if (options?.limit) query = query.limit(options.limit)

  const { data, error } = await query.order('created_at', { ascending: false })
  return { withdrawals: data ?? [], error }
}

export const getActiveSubscriptionPrice = async () => {
  const { data, error } = await supabase
    .from('subscription_price')
    .select('*')
    .eq('active', true)
    .single()
  return { price: data ?? null, error }
}

export const getWithdrawalRequestsWithUsers = async (options?: {
  status?: string
  limit?: number
  offset?: number
  search?: string
}) => {
  let query = supabase
    .from('withdraw_requests')
    .select('*, users:users(id, fullname, email, balance, tier)', { count: 'exact' })

  if (options?.status) query = query.eq('status', options.status)
  if (options?.search) {
    const q = options.search.replace(/%/g, '\\%').replace(/_/g, '\\_')
    query = query.or('fullname.ilike.%' + q + '%,email.ilike.%' + q + '%', { foreignTable: 'users' })
  }
  if (options?.limit) {
    const offset = options?.offset ?? 0
    query = query.range(offset, offset + options.limit - 1)
  }

  const { data, error, count } = await query.order('created_at', { ascending: false })
  return { withdrawals: data ?? [], count: count ?? 0, error }
}

export const approveWithdrawalRequest = async (id: string) => {
  const { data: wr, error: wrError } = await supabase
    .from('withdraw_requests')
    .select('*, users:users(id, fullname, email, balance, tier)')
    .eq('id', id)
    .single()

  if (wrError || !wr || !wr.users) {
    return { error: wrError ?? new Error('Withdrawal request not found') }
  }

  if (wr.status !== 'pending') {
    return { error: new Error('Withdrawal already processed') }
  }

  const amount = Number(wr.amount || 0)
  const currentBalance = Number(wr.users.balance || 0)
  if (currentBalance < amount) {
    return { error: new Error('Saldo tidak cukup') }
  }

  const newBalance = (currentBalance - amount).toString()

  const { error: balanceError } = await supabase
    .from('users')
    .update({ balance: newBalance })
    .eq('id', wr.user_id)

  if (balanceError) {
    return { error: balanceError }
  }

  const { error: updateError } = await supabase
    .from('withdraw_requests')
    .update({ status: 'approved' })
    .eq('id', id)

  if (updateError) {
    return { error: updateError }
  }

  const period = new Date().toISOString().split('T')[0]
  const { error: walletError } = await supabase
    .from('wallet_transactions')
    .insert([
      {
        user_id: wr.user_id,
        type: 'withdrawal',
        amount,
        status: 'completed',
        source_period: period,
        applied_percentage: null,
        tier_at_time: wr.users?.tier ?? null
      }
    ])

  if (walletError) {
    return { error: walletError }
  }

  return { balance: newBalance }
}

export const rejectWithdrawalRequest = async (id: string) => {
  const { error } = await supabase
    .from('withdraw_requests')
    .update({ status: 'rejected' })
    .eq('id', id)

  return { error }
}

export const getFinancialMetrics = async () => {
  // Minimal metrics; adjust to your schema as needed
  const { data, error } = await supabase
    .from('financial_metrics')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)
  return { data: data?.[0] ?? null, error }
}

export const getAppSettings = async () => {
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .eq('key', 'default')
    .maybeSingle()

  if (error) {
    return { settings: null, error }
  }

  if (!data) {
    return {
      settings: {
        key: 'default',
        maintenance_mode: false,
        maintenance_message: 'System is under maintenance',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      error: null
    }
  }

  return { settings: data, error: null }
}

export const updateAppSettings = async (updates: {
  maintenance_mode: boolean
  maintenance_message: string
}) => {
  const { data, error } = await supabase
    .from('app_settings')
    .upsert({
      key: 'default',
      maintenance_mode: updates.maintenance_mode,
      maintenance_message: updates.maintenance_message
    })
    .select()
    .single()

  return { settings: data ?? null, error }
}

export const getExtensionRequests = async (options?: { status?: string; limit?: number }) => {
  let query = supabase.from('extension_requests').select('*')

  if (options?.status) query = query.eq('status', options.status)
  if (options?.limit) query = query.limit(options.limit)

  const { data, error } = await query.order('created_at', { ascending: false })
  return { extensions: data ?? [], error }
}

export const getExtensionRequestsWithUsers = async (options?: {
  status?: string
  limit?: number
  offset?: number
  search?: string
}) => {
  let query = supabase
    .from('extension_requests')
    .select('*, users:users(id, fullname, email, tier, referred_by, subscription_expires_at, balance)', { count: 'exact' })

  if (options?.status) query = query.eq('status', options.status)
  if (options?.search) {
    const q = options.search.replace(/%/g, '\\%').replace(/_/g, '\\_')
    query = query.or('fullname.ilike.%' + q + '%,email.ilike.%' + q + '%', { foreignTable: 'users' })
  }
  if (options?.limit) {
    const offset = options?.offset ?? 0
    query = query.range(offset, offset + options.limit - 1)
  }

  const { data, error, count } = await query.order('created_at', { ascending: false })
  return { extensions: data ?? [], count: count ?? 0, error }
}

export const updateExtensionRequest = async (
  id: string,
  updates: Partial<{ status: string; note: string | null; payment_method: string | null; proof_url: string | null }>
) => {
  const { data, error } = await supabase
    .from('extension_requests')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return { extension: data ?? null, error }
}

const calculateExtendedExpiration = (currentExpiration: string | null) => {
  const now = new Date()
  const baseDate = currentExpiration ? new Date(currentExpiration) : null
  const startDate = baseDate && baseDate > now ? baseDate : now
  const newExpirationDate = new Date(startDate)
  newExpirationDate.setDate(newExpirationDate.getDate() + 30)
  return newExpirationDate
}

export const approveExtensionRequest = async (id: string) => {
  // Load extension with user
  const { data: ext, error: extError } = await supabase
    .from('extension_requests')
    .select('*, users:users(id, fullname, email, tier, referred_by, subscription_expires_at, balance)')
    .eq('id', id)
    .single()

  if (extError || !ext || !ext.users) {
    return { error: extError ?? new Error('Extension request not found') }
  }

  const member = ext.users as {
    id: string
    fullname: string
    email: string
    tier: string
    referred_by: string | null
    subscription_expires_at: string | null
    balance: string | null
  }

  // Load active subscription price
  const { data: price, error: priceError } = await supabase
    .from('subscription_price')
    .select('price_cents')
    .eq('active', true)
    .single()

  if (priceError || !price) {
    return { error: priceError ?? new Error('Active subscription price not found') }
  }

  const amountBase = Number(price.price_cents || 0)

  // Load tiers
  const { data: tiers, error: tiersError } = await supabase
    .from('tiers')
    .select('tier_name, referral_bonus_percentage, cashback_percentage')
    .in('tier_name', ['Rookie', 'Pro', 'Legend'])

  if (tiersError || !tiers) {
    return { error: tiersError ?? new Error('Failed to load tiers') }
  }

  const tierMap = new Map(
    tiers.map(t => [
      t.tier_name,
      {
        referral_bonus_percentage: Number(t.referral_bonus_percentage || 0),
        cashback_percentage: Number(t.cashback_percentage || 0)
      }
    ])
  )

  let referrer: { id: string; tier: string; balance: number; monthly_referral_count: number } | null = null
  let referrerTier = { referral_bonus_percentage: 0 }

  if (member.referred_by) {
    const { data: refData, error: refError } = await supabase
      .from('users')
      .select('id, tier, balance, monthly_referral_count')
      .eq('id', member.referred_by)
      .single()

    if (refError) {
      return { error: refError }
    }

    referrer = {
      id: refData.id,
      tier: refData.tier,
      balance: Number(refData.balance || 0),
      monthly_referral_count: Number(refData.monthly_referral_count || 0)
    }
    referrerTier = tierMap.get(refData.tier) ?? { referral_bonus_percentage: 0 }
  }

  const memberTier = tierMap.get(member.tier) ?? { cashback_percentage: 0 }

  // Only apply bonuses if referred_by exists
  const referralBonusAmount = referrer
    ? (amountBase * (referrerTier.referral_bonus_percentage || 0)) / 100
    : 0

  const cashbackAmount =
    referrer && member.tier === 'Pro'
      ? (amountBase * (memberTier.cashback_percentage || 0)) / 100
      : 0

  // Update extension request status
  const { error: updateExtError } = await supabase
    .from('extension_requests')
    .update({ status: 'approved' })
    .eq('id', id)

  if (updateExtError) {
    return { error: updateExtError }
  }

  // Extend subscription 30 days
  const newExpirationDate = calculateExtendedExpiration(member.subscription_expires_at || null)
  const formattedExpirationDate = newExpirationDate.toISOString()

  const { error: updateUserError } = await supabase
    .from('users')
    .update({ subscription_expires_at: formattedExpirationDate })
    .eq('id', member.id)

  if (updateUserError) {
    return { error: updateUserError }
  }

  const period = new Date().toISOString().split('T')[0]
  const walletRows: Array<{
    user_id: string
    type: string
    amount: number
    status: string
    source_period: string | null
    applied_percentage: number | null
    tier_at_time: string | null
  }> = []

  if (referrer && referralBonusAmount > 0) {
    // Increment monthly_referral_count first
    await supabase
      .from('users')
      .update({ monthly_referral_count: referrer.monthly_referral_count + 1 })
      .eq('id', referrer.id)

    walletRows.push({
      user_id: referrer.id,
      type: 'referral_bonus_extension',
      amount: referralBonusAmount,
      status: 'completed',
      source_period: period,
      applied_percentage: referrerTier.referral_bonus_percentage,
      tier_at_time: referrer.tier
    })
  }

  if (cashbackAmount > 0) {
    walletRows.push({
      user_id: member.id,
      type: 'cashback_extension',
      amount: cashbackAmount,
      status: 'completed',
      source_period: period,
      applied_percentage: memberTier.cashback_percentage,
      tier_at_time: member.tier
    })
  }

  if (walletRows.length > 0) {
    const { error: walletError } = await supabase.from('wallet_transactions').insert(walletRows)
    if (walletError) {
      return { error: walletError }
    }
  }

  if (referrer && referralBonusAmount > 0) {
    await supabase
      .from('users')
      .update({ balance: (referrer.balance + referralBonusAmount).toString() })
      .eq('id', referrer.id)
  }

  if (cashbackAmount > 0) {
    const newBalance = (Number(member.balance || 0) + cashbackAmount).toString()
    await supabase.from('users').update({ balance: newBalance }).eq('id', member.id)
  }

  return {
    extension_id: id,
    new_expiration: newExpirationDate.toISOString(),
    referral_bonus: referralBonusAmount,
    cashback: cashbackAmount
  }
}
