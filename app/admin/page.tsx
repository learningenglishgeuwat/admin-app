'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuth } from './contexts/AdminAuthContext'
import './styles/dashboard.css'

export default function AdminIndexPage() {
  const router = useRouter()
  const { user, loading } = useAdminAuth()

  useEffect(() => {
    if (loading) return

    if (user?.role === 'admin') {
      router.replace('/admin/dashboard')
      return
    }

    router.replace('/admin/login')
  }, [loading, user, router])

  return null
}
