'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Cpu, Eye, EyeOff, Loader, Shield, Zap } from 'lucide-react'
import { adminGetUserRole, adminSignIn } from '@/lib/adminSupabase'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import { useAdminAuth } from '../contexts/AdminAuthContext'

export default function AdminLoginPage() {
  const router = useRouter()
  const { refreshAuth, user, loading } = useAdminAuth()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && user?.role === 'admin') {
      router.replace('/admin/dashboard')
    }
  }, [loading, user, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const { data, error: signInError } = await adminSignIn(
      formData.email.trim(),
      formData.password
    )

    if (signInError || !data.user) {
      setError(signInError?.message ?? 'Login gagal. Periksa email dan password.')
      setIsLoading(false)
      return
    }

    const { role, error: roleError } = await adminGetUserRole(data.user.id)
    if (roleError || role !== 'admin') {
      setError('Akses ditolak. Akun ini bukan admin.')
      await supabaseBrowser.auth.signOut()
      setIsLoading(false)
      return
    }

    await refreshAuth()
    router.replace('/admin/dashboard')
    setIsLoading(false)
  }

  return (
    <div className="login-container">
      <div className="login-background" />
      <div className="login-orb login-orb-cyan" />
      <div className="login-orb login-orb-purple" />
      <div className="login-orb login-orb-pink" />

      <div className="login-form-container">
        <div className="login-form">
          <div className="login-header">
            <div className="login-icon-container">
              <Shield className="login-icon" />
            </div>
            <h1 className="login-title">Geuwat Admin</h1>
            <p className="login-subtitle">Secure Console</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="login-form-group">
              <label className="login-label" htmlFor="email">
                Email Address
              </label>
              <div className="login-input-wrapper">
                <Cpu className="login-input-icon" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="login-input"
                  placeholder="admin@geuwat.app"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="login-form-group">
              <label className="login-label" htmlFor="password">
                Password
              </label>
              <div className="login-input-wrapper">
                <Zap className="login-input-icon" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className="login-input"
                  placeholder="********"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="login-toggle-icon" />
                  ) : (
                    <Eye className="login-toggle-icon" />
                  )}
                </button>
              </div>
            </div>

            <button className="login-submit-btn" type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader className="login-loading-icon" />
                  Verifying...
                </>
              ) : (
                'Access Console'
              )}
            </button>

            {error && (
              <div className="login-error">
                <Shield className="login-error-icon" />
                <div>{error}</div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
