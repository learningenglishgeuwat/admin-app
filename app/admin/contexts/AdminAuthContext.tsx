'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import { adminGetUserRole } from '@/lib/adminSupabase'

type AdminUser = {
  id: string
  email: string | null
  role: 'admin' | 'member' | string
}

type AdminAuthContextValue = {
  user: AdminUser | null
  loading: boolean
  refreshAuth: () => Promise<void>
  signOut: () => Promise<void>
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined)

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)

  const loadSession = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabaseBrowser.auth.getUser()
      if (error || !data.user) {
        setUser(null)
        return
      }

      const { role, error: roleError } = await adminGetUserRole(data.user.id)
      if (roleError) {
        console.error('Admin role lookup failed:', roleError)
        setUser(null)
        return
      }

      setUser({
        id: data.user.id,
        email: data.user.email ?? null,
        role: role ?? 'member'
      })
    } catch (err) {
      console.error('Failed to load session:', err)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSession()
    const { data: subscription } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null)
        setLoading(false)
        return
      }
      void loadSession()
    })

    return () => {
      subscription.subscription.unsubscribe()
    }
  }, [loadSession])

  const refreshAuth = useCallback(async () => {
    await loadSession()
  }, [loadSession])

  const signOut = useCallback(async () => {
    await supabaseBrowser.auth.signOut()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, refreshAuth, signOut }),
    [user, loading, refreshAuth, signOut]
  )

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider')
  }
  return ctx
}
