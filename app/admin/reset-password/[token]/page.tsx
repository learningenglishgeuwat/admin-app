'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowLeft, CheckCircle, Eye, EyeOff, Loader, Lock } from 'lucide-react'
import { adminUpdatePassword } from '@/lib/adminSupabase'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const [formData, setFormData] = useState({ password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [tokenValid, setTokenValid] = useState(true)

  useEffect(() => {
    const initSessionFromUrl = async () => {
      try {
        const hash = window.location.hash.replace('#', '')
        const params = new URLSearchParams(hash)
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')

        if (!accessToken || !refreshToken) {
          setTokenValid(false)
          setError('Token reset tidak valid atau sudah kedaluwarsa.')
          return
        }

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })

        if (sessionError) {
          setTokenValid(false)
          setError('Token reset tidak valid atau sudah kedaluwarsa.')
        }
      } catch {
        setTokenValid(false)
        setError('Token reset tidak valid atau sudah kedaluwarsa.')
      }
    }

    void initSessionFromUrl()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      if (!formData.password || !formData.confirmPassword) {
        setError('Password harus diisi')
        return
      }
      if (formData.password.length < 6) {
        setError('Password minimal 6 karakter')
        return
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Konfirmasi password tidak cocok')
        return
      }

      const { error: updateError } = await adminUpdatePassword(formData.password)
      if (updateError) {
        throw updateError
      }

      setSuccess(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal reset password.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
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
              <Lock className="login-icon" />
            </div>
            <h1 className="login-title">Reset Password</h1>
            <p className="login-subtitle">Buat password baru</p>
          </div>

          {!tokenValid && (
            <div className="login-error">
              <AlertCircle className="login-error-icon" />
              <div>{error || 'Token reset tidak valid.'}</div>
            </div>
          )}

          {success ? (
            <div className="login-error">
              <CheckCircle className="login-icon-success" />
              <div>Password berhasil diubah. Silakan login kembali.</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="login-form-group">
                <label className="login-label" htmlFor="password">
                  Password Baru
                </label>
                <div className="login-input-wrapper">
                  <Lock className="login-input-icon" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    className="login-input"
                    placeholder="********"
                    value={formData.password}
                    onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                    autoComplete="new-password"
                    required
                    disabled={!tokenValid}
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

              <div className="login-form-group">
                <label className="login-label" htmlFor="confirmPassword">
                  Konfirmasi Password
                </label>
                <div className="login-input-wrapper">
                  <Lock className="login-input-icon" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="login-input"
                    placeholder="********"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                    }
                    autoComplete="new-password"
                    required
                    disabled={!tokenValid}
                  />
                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="login-toggle-icon" />
                    ) : (
                      <Eye className="login-toggle-icon" />
                    )}
                  </button>
                </div>
              </div>

              {error && tokenValid && (
                <div className="login-error">
                  <AlertCircle className="login-error-icon" />
                  <div>{error}</div>
                </div>
              )}

              <button className="login-submit-btn" type="submit" disabled={isLoading || !tokenValid}>
                {isLoading ? (
                  <>
                    <Loader className="login-loading-icon" />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan Password'
                )}
              </button>
            </form>
          )}

          <div className="login-back-link">
            <Link href="/admin/login" className="login-back-anchor">
              <ArrowLeft className="login-back-icon" />
              Kembali ke Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
