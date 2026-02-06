'use client'

import React, { useState } from 'react'
import { CheckCircle, Copy, Send, AlertCircle, Phone, Mail, User } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase'
import { generateReferralCode } from '@/lib/referralCodeGenerator'

interface ParsedData {
  nama: string;
  email: string;
  whatsapp: string;
  referral: string;
}

const WHATSAPP_TEMPLATE = `Hi GEUWAT,
Selamat datang! Akun Anda dengan email {{email}} telah berhasil didaftarkan.
Nomor referral: {{referralCode}}
Untuk mulai menggunakan GEUWAT, silakan lakukan pembayaran langganan.`

export default function RegistrationPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [registrationSuccess, setRegistrationSuccess] = useState(false)
  const [registrationError, setRegistrationError] = useState('')
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [whatsappMessage, setWhatsappMessage] = useState('')

  // Parse WhatsApp message
  const parseWhatsAppMessage = (whatsappText: string): ParsedData | null => {
    try {
      const lines = whatsappText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)

      const normalizeLine = (line: string) => line.replace(/^[^\p{L}\p{N}]+/u, '').trim()

      const findByRegex = (patterns: RegExp[]) => {
        for (const rawLine of lines) {
          const line = normalizeLine(rawLine)
          for (const pattern of patterns) {
            const match = line.match(pattern)
            if (match && match[1]) {
              return match[1].trim()
            }
          }
        }
        return ''
      }

      const nama = findByRegex([
        /^(?:nama|name)\s*[:\-]\s*(.+)$/i,
        /^(?:nama|name)\s+(.+)$/i
      ])

      const email = findByRegex([
        /^email\s*[:\-]\s*(.+)$/i,
        /^email\s+(.+)$/i
      ])

      const whatsapp = findByRegex([
        /^(?:whatsapp|wa|no\.?\s*wa|no\.?\s*whatsapp|nomor\s*wa|nomor\s*whatsapp|phone|telp|telepon)\s*[:\-]\s*(.+)$/i,
        /^(?:whatsapp|wa|no\.?\s*wa|no\.?\s*whatsapp|nomor\s*wa|nomor\s*whatsapp|phone|telp|telepon)\s+(.+)$/i
      ])

      const referral = findByRegex([
        /^(?:referral|kode\s*referral|referrer)\s*[:\-]\s*(.+)$/i,
        /^(?:referral|kode\s*referral|referrer)\s+(.+)$/i
      ])

      if (!nama || !email || !whatsapp) {
        return null
      }

      return { nama, email, whatsapp, referral }
    } catch {
      return null
    }
  }

  const handleWhatsAppInput = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setRegistrationError('')
    setRegistrationSuccess(false)
    setRegistrationResult(null)

    const form = e.currentTarget
    const formData = new FormData(form)
    const message = String(formData.get('message') || '')
    const parsed = parseWhatsAppMessage(message)

    if (!parsed) {
      setParsedData(null)
      setWhatsappMessage('')
      setRegistrationError('Format pesan tidak valid. Pastikan ada Nama, Email, dan WhatsApp.')
      return
    }

    setParsedData(parsed)
    const referralCode = generateReferralCode(parsed.email, parsed.whatsapp, Boolean(parsed.referral))
    const templatedMessage = WHATSAPP_TEMPLATE
      .replace('{{email}}', parsed.email)
      .replace('{{referralCode}}', referralCode)
    setWhatsappMessage(templatedMessage)
  }

  // State for registration result
  const [registrationResult, setRegistrationResult] = useState<{
    success: boolean;
    referral_code?: string;
    message?: string;
  } | null>(null)

  const handleRegistration = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!parsedData) {
      setRegistrationError('Data member belum tersedia.')
      return
    }

    setIsSubmitting(true)
    setRegistrationError('')

    try {
      const response = await fetch('/api/admin/register-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: parsedData.nama,
          email: parsedData.email,
          whatsapp: parsedData.whatsapp,
          referral: parsedData.referral || null
        })
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result?.error || 'Gagal mendaftarkan member.')
      }

      const finalReferralCode = result.referral_code as string
      const templatedMessage = WHATSAPP_TEMPLATE
        .replace('{{email}}', parsedData.email)
        .replace('{{referralCode}}', finalReferralCode)

      setWhatsappMessage(templatedMessage)
      setRegistrationResult({
        success: true,
        referral_code: finalReferralCode,
        message: 'Member berhasil didaftarkan.'
      })
      setRegistrationSuccess(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal mendaftarkan member.'
      setRegistrationError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-background">
        <div className="dashboard-orb dashboard-orb-cyan"></div>
        <div className="dashboard-orb dashboard-orb-purple"></div>
        <div className="dashboard-orb dashboard-orb-pink"></div>
      </div>
      
      <div className="dashboard-layout">
        <div className="dashboard-main">
          <div className="dashboard-content">
            <div className="dashboard-page registration-page">
              {registrationSuccess ? (
                <div className="dashboard-card registration-success-card">
                  <div className="card-content">
                    <div className="registration-row">
                      <CheckCircle className="registration-icon-success" />
                      <div>
                        <h2 className="registration-success-title">Pendaftaran Berhasil!</h2>
                        <p className="registration-success-text">Member berhasil didaftarkan dengan nomor referral:</p>
                        <div className="registration-code-row">
                          <span className="registration-code-pill">
                            {registrationResult?.referral_code || 'N/A'}
                          </span>
                          <button
                            onClick={() => {
                              const referralCode = registrationResult?.referral_code || ''
                              navigator.clipboard.writeText(referralCode)
                            }}
                            className="registration-copy-button"
                          >
                            <Copy className="registration-copy-icon" />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="registration-message">
                      <h3 className="registration-message-title">Pesan WhatsApp:</h3>
                      <div className="registration-message-box">
                        <pre className="registration-message-text">{whatsappMessage}</pre>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* WhatsApp Message Input */}
                  <div className="dashboard-card">
                    <div className="card-header">
                      <h2 className="card-title">Input Pesan WhatsApp</h2>
                    </div>
                    <div className="card-content">
                      <form onSubmit={handleWhatsAppInput} className="registration-form">
                        <div>
                          <label className="form-label">
                            Paste pesan WhatsApp dari calon member
                          </label>
                          <textarea
                            name="message"
                            rows={8}
                            className="form-textarea registration-textarea"
                            placeholder="Nama: John Doe&#10;Email: john@example.com&#10;WhatsApp: +628123456789&#10;Referral: ABC123 (opsional)"
                          />
                        </div>
                        <div className="registration-form-actions">
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn btn-primary"
                          >
                            <User className="btn-icon" />
                            Parse Pesan
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>

                  {/* Parsed Data Display */}
                  {parsedData && (
                    <div className="dashboard-card">
                      <div className="card-header">
                        <h2 className="card-title">Data Teridentifikasi</h2>
                      </div>
                      <div className="card-content">
                        <div className="registration-grid">
                          <div className="registration-list">
                            <div className="registration-item">
                              <User className="registration-item-icon" />
                              <span className="registration-item-text">
                                <strong>Nama:</strong> {parsedData.nama}
                              </span>
                            </div>
                            <div className="registration-item">
                              <Mail className="registration-item-icon" />
                              <span className="registration-item-text">
                                <strong>Email:</strong> {parsedData.email}
                              </span>
                            </div>
                            <div className="registration-item">
                              <Phone className="registration-item-icon" />
                              <span className="registration-item-text">
                                <strong>WhatsApp:</strong> {parsedData.whatsapp}
                              </span>
                            </div>
                            {parsedData.referral && (
                              <div className="registration-item">
                                <CheckCircle className="registration-item-icon registration-item-icon-success" />
                                <span className="registration-item-text">
                                  <strong>Referral:</strong> {parsedData.referral}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="registration-preview">
                          <h4 className="registration-preview-title">Referral Code Preview:</h4>
                          <div className="registration-preview-box">
                            <code className="registration-preview-code">
                              {generateReferralCode(parsedData.email, parsedData.whatsapp, parsedData.referral ? true : false)}
                            </code>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Registration Form */}
                  {parsedData && (
                    <form onSubmit={handleRegistration} className="registration-form-actions">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn btn-primary"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="registration-spinner" />
                            <span>Memproses...</span>
                          </>
                        ) : (
                          <>
                            <Send className="btn-icon" />
                            Daftarkan Member
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </>
              )}

              {/* Error Message */}
              {registrationError && (
                <div className="dashboard-card registration-error-card">
                  <div className="card-content">
                    <div className="registration-row">
                      <AlertCircle className="registration-icon-error" />
                      <div>
                        <h3 className="registration-error-title">Terjadi Kesalahan</h3>
                        <p className="registration-error-text">{registrationError}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {whatsappMessage && !registrationSuccess && (
                <div className="dashboard-card">
                  <div className="card-content">
                    <p className="registration-muted-text">{whatsappMessage}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
