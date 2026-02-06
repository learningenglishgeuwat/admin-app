import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const isPublicAdminPath = (pathname: string) => {
  return (
    pathname === '/admin/login' ||
    pathname === '/admin/dashboard/register' ||
    pathname === '/admin/registrationForm' ||
    pathname.startsWith('/admin/forgot-password') ||
    pathname.startsWith('/admin/reset-password')
  )
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  if (isPublicAdminPath(pathname)) {
    return NextResponse.next()
  }

  const response = NextResponse.next()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: (name) => request.cookies.get(name)?.value,
      set: (name, value, options) => {
        response.cookies.set({ name, value, ...options })
      },
      remove: (name, options) => {
        response.cookies.set({ name, value: '', ...options, maxAge: 0 })
      }
    }
  })

  return supabase.auth.getUser().then(async ({ data, error }) => {
    if (error || !data.user) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      url.searchParams.set('returnTo', pathname)
      return NextResponse.redirect(url)
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle()

    if (profileError || profile?.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      url.searchParams.set('returnTo', pathname)
      return NextResponse.redirect(url)
    }

    return response
  })
}

export const config = {
  matcher: ['/admin/:path*']
}
