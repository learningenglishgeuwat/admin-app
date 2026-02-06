'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader } from 'lucide-react'
import { useAdminAuth } from '../contexts/AdminAuthContext'

type ProtectedRouteProps = {
  children: React.ReactNode
  requiredRole?: 'admin' | 'member'
  fallback?: React.ReactNode
}

export default function ProtectedRoute({
  children,
  requiredRole = 'admin',
  fallback
}: ProtectedRouteProps) {
  const router = useRouter()
  const { user, loading } = useAdminAuth()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/admin/login')
        return
      }
      if (requiredRole && user.role !== requiredRole) {
        router.push('/admin/login')
      }
    }
  }, [loading, requiredRole, router, user])

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin w-8 h-8 text-cyan-500 mx-auto mb-4" />
          <p className="text-gray-400">Authenticating...</p>
        </div>
      </div>
    )
  }

  if (!user || (requiredRole && user.role !== requiredRole)) {
    return (
      fallback || (
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-400">Access Denied</p>
            <button
              onClick={() => router.push('/admin/login')}
              className="mt-4 px-4 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600 transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      )
    )
  }

  return <>{children}</>
}
