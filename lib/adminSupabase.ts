import { supabase } from './supabase'
import { supabaseBrowser } from './supabaseBrowser'
import type { Database, User } from '@/types/database'

type Tables = Database['public']['Tables']

export const adminSignIn = async (email: string, password: string) => {
  const { data, error } = await supabaseBrowser.auth.signInWithPassword({ email, password })
  return { data, error }
}

export const adminGetUserRole = async (userId: string) => {
  const { data, error } = await supabase
    .from<'users', Tables['users']>('users')
    .select('role')
    .eq('id', userId)
    .single()

  return { role: data?.role ?? null, error }
}

export const adminGetUsers = async (options?: {
  search?: string
  status?: string
  tier?: string
  role?: string
  limit?: number
  offset?: number
}) => {
  let query = supabase.from<'users', Tables['users']>('users').select('*', { count: 'exact' })

  if (options?.status) query = query.eq('status', options.status)
  if (options?.tier) query = query.eq('tier', options.tier)
  if (options?.role) query = query.eq('role', options.role)
  if (options?.search) {
    const q = options.search.replace(/%/g, '\\%').replace(/_/g, '\\_')
    query = query.or(`fullname.ilike.%${q}%,email.ilike.%${q}%`)
  }
  if (options?.limit) {
    const offset = options?.offset ?? 0
    query = query.range(offset, offset + options.limit - 1)
  }

  const { data, error, count } = await query.order('created_at', { ascending: false })
  const users = (data ?? []) as User[]
  return { users, count: count ?? 0, error }
}

export const adminUpdateUserStatus = async (
  userId: string,
  status: 'unpaid' | 'paid' | 'active' | 'inactive' | 'suspend' | 'ban'
) => {
  const { data, error } = await supabase
    .from<'users', Tables['users']>('users')
    .update({ status } as Tables['users']['Update'])
    .eq('id', userId)
    .select()
    .single()
  return { user: data ?? null, error }
}

export const adminUpdateUserStatusAndExpiration = async (
  userId: string,
  status: 'active' | 'inactive' | 'suspend' | 'ban' | 'paid' | 'unpaid',
  subscription_expires_at: string
) => {
  const { data, error } = await supabase
    .from<'users', Tables['users']>('users')
    .update({ status, subscription_expires_at } as Tables['users']['Update'])
    .eq('id', userId)
    .select()
    .single()
  return { user: data ?? null, error }
}

export const adminUpdateUserRole = async (userId: string, role: 'member' | 'admin') => {
  const { data, error } = await supabase
    .from<'users', Tables['users']>('users')
    .update({ role } as Tables['users']['Update'])
    .eq('id', userId)
    .select()
    .single()
  return { user: data ?? null, error }
}

export const adminUpdateUserTier = async (
  userId: string,
  tier: 'Rookie' | 'Pro' | 'Legend'
) => {
  const { data, error } = await supabase
    .from<'users', Tables['users']>('users')
    .update({ tier } as Tables['users']['Update'])
    .eq('id', userId)
    .select()
    .single()
  return { user: data ?? null, error }
}

export const adminUpdatePassword = async (newPassword: string) => {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword })
  return { data, error }
}

const calculateExtendedExpiration = (currentExpiration: string | null) => {
  const now = new Date()
  const baseDate = currentExpiration ? new Date(currentExpiration) : null
  const startDate = baseDate && baseDate > now ? baseDate : now
  const newExpirationDate = new Date(startDate)
  newExpirationDate.setDate(newExpirationDate.getDate() + 30)
  return newExpirationDate
}

export const adminMarkPaidWithBonus = async (userId: string) => {
  // Load user
  const { data: user, error: userError } = await supabase
    .from<'users', Tables['users']>('users')
    .select('id, tier, referred_by, subscription_expires_at, balance')
    .eq('id', userId)
    .single()

  if (userError || !user) {
    return { error: userError ?? new Error('User not found') }
  }

  // Load active subscription price
  const { data: price, error: priceError } = await supabase
    .from<'subscription_price', Tables['subscription_price']>('subscription_price')
    .select('price_cents, currency')
    .eq('active', true)
    .single()

  if (priceError || !price) {
    return { error: priceError ?? new Error('Active subscription price not found') }
  }

  const amountBase = Number(price.price_cents || 0)

  // Load tiers for member and referrer
  const tierNames: string[] = [user.tier]
  if (user.referred_by) {
    tierNames.push('referrer')
  }

  const { data: tiers, error: tiersError } = await supabase
    .from<'tiers', Tables['tiers']>('tiers')
    .select('tier_name, referral_bonus_percentage, cashback_percentage')
    .in('tier_name', [user.tier, 'Rookie', 'Pro', 'Legend'])

  if (tiersError || !tiers) {
    return { error: tiersError ?? new Error('Failed to load tiers') }
  }

  const tierMap = new Map(
    tiers.map(t => [t.tier_name, {
      referral_bonus_percentage: Number(t.referral_bonus_percentage || 0),
      cashback_percentage: Number(t.cashback_percentage || 0)
    }])
  )

  const memberTier = tierMap.get(user.tier) ?? { referral_bonus_percentage: 0, cashback_percentage: 0 }

  let referrer = null as { id: string; tier: string; balance: number; monthly_referral_count: number } | null
  let referrerTier = { referral_bonus_percentage: 0, cashback_percentage: 0 }

  if (user.referred_by) {
    const { data: refData, error: refError } = await supabase
      .from<'users', Tables['users']>('users')
      .select('id, tier, balance, monthly_referral_count')
      .eq('id', user.referred_by)
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
    referrerTier = tierMap.get(refData.tier) ?? { referral_bonus_percentage: 0, cashback_percentage: 0 }
  }

  const referralBonusAmount = referrer
    ? (amountBase * (referrerTier.referral_bonus_percentage || 0)) / 100
    : 0

  const cashbackAmount = user.referred_by
    ? (amountBase * (memberTier.cashback_percentage || 0)) / 100
    : 0

  const newExpirationDate = calculateExtendedExpiration(user.subscription_expires_at || null)
  const formattedExpirationDate = newExpirationDate.toISOString().split('T')[0]

  const { data: updatedUser, error: updateError } = await supabase
    .from<'users', Tables['users']>('users')
    .update({
      status: 'paid',
      subscription_expires_at: formattedExpirationDate
    })
    .eq('id', userId)
    .select()
    .single()

  if (updateError) {
    return { error: updateError }
  }

  const walletRows: Array<{
    user_id: string
    type: string
    amount: number
    status: string
    source_period: string | null
    applied_percentage: number | null
    tier_at_time: string | null
  }> = []

  const period = new Date().toISOString().split('T')[0]

  if (referrer && referralBonusAmount > 0) {
    walletRows.push({
      user_id: referrer.id,
      type: 'referral_bonus',
      amount: referralBonusAmount,
      status: 'completed',
      source_period: period,
      applied_percentage: referrerTier.referral_bonus_percentage,
      tier_at_time: referrer.tier
    })
  }

  if (cashbackAmount > 0) {
    walletRows.push({
      user_id: userId,
      type: 'cashback',
      amount: cashbackAmount,
      status: 'completed',
      source_period: period,
      applied_percentage: memberTier.cashback_percentage,
      tier_at_time: user.tier
    })
  }

  if (walletRows.length > 0) {
    const { error: walletError } = await supabase
      .from<'wallet_transactions', Tables['wallet_transactions']>('wallet_transactions')
      .insert(walletRows as Tables['wallet_transactions']['Insert'][])
    if (walletError) {
      return { error: walletError }
    }
  }

  // Update balances
  if (referrer && referralBonusAmount > 0) {
    const newReferrerBalance = (referrer.balance + referralBonusAmount).toString()
    await supabase
      .from<'users', Tables['users']>('users')
      .update({ balance: newReferrerBalance })
      .eq('id', referrer.id)

    // Increment referrer's monthly referral count when mark as paid
    await supabase
      .from<'users', Tables['users']>('users')
      .update({ monthly_referral_count: referrer.monthly_referral_count + 1 } as Tables['users']['Update'])
      .eq('id', referrer.id)
  }

  if (cashbackAmount > 0) {
    const newBalance = (Number(user.balance || 0) + cashbackAmount).toString()
    await supabase
      .from<'users', Tables['users']>('users')
      .update({ balance: newBalance })
      .eq('id', userId)
  }

  return {
    user: updatedUser as unknown as User,
    expiration: newExpirationDate.toISOString(),
    referralBonusAmount,
    cashbackAmount,
    referrerId: referrer?.id ?? null
  }
}
