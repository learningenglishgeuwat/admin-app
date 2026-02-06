'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, Loader, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess(false)

    try {
      if (!email) {
        setError('Email harus diisi')
        return
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        setError('Format email tidak valid')
        return
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/admin/reset-password`
      })

      if (resetError) {
        throw resetError
      }

      setSuccess(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal mengirim email reset.'
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
              <Mail className="login-icon" />
            </div>
            <h1 className="login-title">Forgot Password</h1>
            <p className="login-subtitle">Reset akun admin</p>
          </div>

          {success ? (
            <div className="login-error">
              <CheckCircle className="login-icon-success" />
              <div>Email reset sudah dikirim. Cek inbox kamu.</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="login-form-group">
                <label className="login-label" htmlFor="email">
                  Email Address
                </label>
                <div className="login-input-wrapper">
                  <Mail className="login-input-icon" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className="login-input"
                    placeholder="admin@geuwat.app"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="login-error">
                  <Mail className="login-error-icon" />
                  <div>{error}</div>
                </div>
              )}

              <button className="login-submit-btn" type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader className="login-loading-icon" />
                    Mengirim...
                  </>
                ) : (
                  'Kirim Email Reset'
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
