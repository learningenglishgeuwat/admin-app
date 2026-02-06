import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { generateReferralCode } from '@/lib/referralCodeGenerator'
import type { Database } from '@/types/database'

type RegisterPayload = {
  nama: string
  email: string
  whatsapp: string
  referral?: string | null
}

const getEnv = (key: string) => process.env[key] || ''
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const whatsappRegex = /^[+\d][\d\s()-]{6,}$/
const rateWindowMs = 60_000
const rateLimitMax = 10
const rateBucket = new Map<string, number[]>()

const findAuthUserByEmail = async (adminClient: ReturnType<typeof createClient<Database>>, email: string) => {
  let page = 1
  const perPage = 200
  for (;;) {
    const list = await adminClient.auth.admin.listUsers({ page, perPage })
    if (list.error) {
      return { user: null, error: list.error }
    }
    const found = list.data.users.find((u) => u.email?.toLowerCase() === email)
    if (found) {
      return { user: found, error: null }
    }
    if (list.data.users.length < perPage) {
      break
    }
    page += 1
  }
  return { user: null, error: null }
}

const generateUniqueReferralCode = async (
  adminClient: ReturnType<typeof createClient<Database>>,
  email: string,
  whatsapp: string,
  hasReferral: boolean
) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const base = generateReferralCode(email, whatsapp, hasReferral)
    const suffix = attempt === 0 ? '' : String(Math.floor(Math.random() * 90 + 10))
    const code = `${base}${suffix}`
    const { data } = await adminClient
      .from('users')
      .select('id')
      .eq('referral_code', code)
      .maybeSingle()
    if (!data) {
      return code
    }
  }
  return generateReferralCode(email, whatsapp, hasReferral)
}

export async function POST(request: NextRequest) {
  const now = Date.now()
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  const entries = rateBucket.get(ip) ?? []
  const fresh = entries.filter((ts) => now - ts < rateWindowMs)
  if (fresh.length >= rateLimitMax) {
    return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 })
  }
  fresh.push(now)
  rateBucket.set(ip, fresh)

  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL')
  const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server config missing.' }, { status: 500 })
  }

  // Validate requester via cookie-based auth
  const authClient = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: (name) => request.cookies.get(name)?.value,
      set: () => {},
      remove: () => {}
    }
  })

  const { data: authData, error: authError } = await authClient.auth.getUser()
  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await authClient
    .from('users')
    .select('role')
    .eq('id', authData.user.id)
    .maybeSingle()

  if (profileError || profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  let payload: RegisterPayload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  const nama = payload.nama?.trim()
  const email = payload.email?.trim().toLowerCase()
  const whatsapp = payload.whatsapp?.trim()
  const referral = payload.referral?.trim() || null

  if (!nama || !email || !whatsapp) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
  }
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'Invalid email format.' }, { status: 400 })
  }
  if (!whatsappRegex.test(whatsapp)) {
    return NextResponse.json({ error: 'Invalid WhatsApp number.' }, { status: 400 })
  }

  const adminClient = createClient<Database>(supabaseUrl, serviceRoleKey)

  let authUserId: string | null = null
  const createResult = await adminClient.auth.admin.createUser({
    email,
    password: '123456',
    email_confirm: true,
    user_metadata: {
      fullname: nama,
      whatsapp
    }
  })

  if (createResult.error) {
    const message = createResult.error.message || 'Auth user creation failed.'
    if (!message.toLowerCase().includes('already')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }

    // Fallback: look up existing user by email
    const { user: existing, error: listError } = await findAuthUserByEmail(adminClient, email)
    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 400 })
    }
    if (!existing) {
      return NextResponse.json({ error: 'Auth user not found.' }, { status: 404 })
    }
    authUserId = existing.id
  } else {
    authUserId = createResult.data.user?.id ?? null
  }

  if (!authUserId) {
    return NextResponse.json({ error: 'Auth user id missing.' }, { status: 400 })
  }

  let referredBy: string | null = null
  if (referral) {
    const { data: refUser } = await adminClient
      .from('users')
      .select('id')
      .eq('referral_code', referral)
      .maybeSingle()
    referredBy = refUser?.id ?? null
  }

  const referralCode = await generateUniqueReferralCode(adminClient, email, whatsapp, Boolean(referral))

  const { error: insertError, data: profileData } = await adminClient
    .from('users')
    .upsert(
      {
        id: authUserId,
        fullname: nama,
        email,
        whatsapp,
        role: 'member',
        status: 'unpaid',
        tier: 'Rookie',
        balance: '0',
        referral_code: referralCode,
        referred_by: referredBy,
        membership_start: new Date().toISOString(),
        subscription_expires_at: null
      },
      { onConflict: 'id' }
    )
    .select('id, referral_code')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    user_id: profileData.id,
    referral_code: profileData.referral_code
  })
}
