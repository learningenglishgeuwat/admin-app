'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle, Edit, Save, TrendingUp, X } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase'
import type { Database } from '@/types/database'

type Tier = Database['public']['Tables']['tiers']['Row']
type SubscriptionPrice = Database['public']['Tables']['subscription_price']['Row']

export default function ReferralTiersPage() {
  const [tiers, setTiers] = useState<Tier[]>([])
  const [subscriptionPrice, setSubscriptionPrice] = useState<SubscriptionPrice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tempTiers, setTempTiers] = useState<Tier[]>([])
  const [tempPrice, setTempPrice] = useState<SubscriptionPrice | null>(null)

  useEffect(() => {
    void loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const { data: tiersData, error: tiersError } = await supabaseAdmin
        .from('tiers')
        .select('*')
        .order('min_referrals', { ascending: true })

      if (tiersError) {
        throw tiersError
      }

      const { data: priceData, error: priceError } = await supabaseAdmin
        .from('subscription_price')
        .select('*')
        .single()

      if (priceError) {
        throw priceError
      }

      setTiers(tiersData ?? [])
      setSubscriptionPrice(priceData ?? null)
      setTempTiers(tiersData ?? [])
      setTempPrice(priceData ?? null)
      setSuccess('Data berhasil dimuat.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal memuat data.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const priceLabel = useMemo(() => {
    if (!subscriptionPrice) return 'Belum tersedia'
    return `${subscriptionPrice.price_cents} ${subscriptionPrice.currency}`
  }, [subscriptionPrice])

  const handleEditToggle = () => {
    setEditing(true)
    setTempTiers(tiers)
    setTempPrice(subscriptionPrice)
    setError(null)
    setSuccess(null)
  }

  const handleCancel = () => {
    setEditing(false)
    setTempTiers(tiers)
    setTempPrice(subscriptionPrice)
    setError(null)
    setSuccess(null)
  }

  const handleTierChange = (
    index: number,
    field: 'min_referrals' | 'referral_bonus_percentage' | 'cashback_percentage',
    value: string
  ) => {
    setTempTiers((prev) => {
      const next = [...prev]
      const current = { ...next[index] }

      if (field === 'min_referrals') {
        current.min_referrals = Number(value || 0)
      } else if (field === 'referral_bonus_percentage') {
        current.referral_bonus_percentage = String(value || 0)
      } else {
        current.cashback_percentage = String(value || 0)
      }

      next[index] = current
      return next
    })
  }

  const handlePriceChange = (key: keyof SubscriptionPrice, value: string) => {
    setTempPrice((prev) => {
      if (!prev) return prev
      const next = { ...prev }
      if (key === 'price_cents') {
        next.price_cents = Number(value || 0)
      } else if (key === 'currency') {
        next.currency = value
      } else if (key === 'name') {
        next.name = value
      }
      return next
    })
  }

  const handleSave = async () => {
    if (!tempPrice) return
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      // Update subscription price
      const { error: priceError } = await supabaseAdmin
        .from('subscription_price')
        .update({
          name: tempPrice.name,
          price_cents: Number(tempPrice.price_cents || 0),
          currency: tempPrice.currency
        })
        .eq('id', tempPrice.id)

      if (priceError) {
        throw new Error(`Subscription price: ${priceError.message}`)
      }

      // Update tiers
      for (const tier of tempTiers) {
        const { error: tierError } = await supabaseAdmin
          .from('tiers')
          .update({
            min_referrals: Number(tier.min_referrals || 0),
            referral_bonus_percentage: String(tier.referral_bonus_percentage || 0),
            cashback_percentage: String(tier.cashback_percentage || 0)
          })
          .eq('tier_name', tier.tier_name)

        if (tierError) {
          throw new Error(`Tier ${tier.tier_name}: ${tierError.message}`)
        }
      }

      setSubscriptionPrice(tempPrice)
      setTiers(tempTiers)
      setEditing(false)
      setSuccess('Perubahan berhasil disimpan.')
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Gagal menyimpan perubahan.'
      setError(message)
    } finally {
      setSaving(false)
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
            <div className="dashboard-page">
              <div className="page-header">
                <div>
                  <h1 className="page-title">Referral Tiers</h1>
                  <p className="page-subtitle">Kelola tier referral dan harga langganan.</p>
                </div>
                <div className="header-actions">
                  {!editing ? (
                    <button className="btn btn-secondary" onClick={handleEditToggle} type="button">
                      <Edit className="btn-icon" />
                      Edit
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        type="button"
                        disabled={saving}
                      >
                        <Save className="btn-icon" />
                        {saving ? 'Menyimpan...' : 'Simpan'}
                      </button>
                      <button className="btn btn-secondary" onClick={handleCancel} type="button">
                        <X className="btn-icon" />
                        Batal
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {loading && (
                <div className="dashboard-card">
                  <div className="card-content flex items-center gap-3">
                    <div className="loading-spinner-large" />
                    <span className="loading-text">Memuat data...</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="dashboard-card registration-error-card">
                  <div className="card-content">
                    <div className="registration-row">
                      <AlertCircle className="registration-icon-error" />
                      <div>
                        <h3 className="registration-error-title">Terjadi Kesalahan</h3>
                        <p className="registration-error-text">{error}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {success && !loading && !error && (
                <div className="dashboard-card registration-success-card">
                  <div className="card-content">
                    <div className="registration-row">
                      <CheckCircle className="registration-icon-success" />
                      <div>
                        <h3 className="registration-success-title">Sukses</h3>
                        <p className="registration-success-text">{success}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="summary-cards">
                <div className="dashboard-card">
                  <div className="card-content">
                    <div className="flex items-center gap-3">
                      <div className="analytics-icon analytics-icon-info">
                        <TrendingUp className="analytics-icon-svg" />
                      </div>
                      <div>
                        <div className="analytics-title">Harga Langganan</div>
                        <div className="analytics-value">{priceLabel}</div>
                      </div>
                    </div>
                    {editing && tempPrice && (
                      <div className="mt-4 grid gap-3">
                        <div>
                          <label className="form-label">Nama Paket</label>
                          <input
                            className="form-input"
                            value={tempPrice.name ?? ''}
                            onChange={(e) => handlePriceChange('name', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="form-label">Harga (cents)</label>
                          <input
                            className="form-input"
                            type="number"
                            value={tempPrice.price_cents ?? 0}
                            onChange={(e) => handlePriceChange('price_cents', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="form-label">Currency</label>
                          <input
                            className="form-input"
                            value={tempPrice.currency ?? ''}
                            onChange={(e) => handlePriceChange('currency', e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="dashboard-card">
                <div className="card-header">
                  <h2 className="card-title">Daftar Tier</h2>
                </div>
                <div className="card-content">
                  {tiers.length === 0 ? (
                    <div className="empty-state">Belum ada tier.</div>
                  ) : (
                    <div className="table-responsive data-table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Tier</th>
                            <th>Min Referrals</th>
                            <th>Referral Bonus (%)</th>
                            <th>Cashback (%)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(editing ? tempTiers : tiers).map((tier, index) => (
                            <tr key={tier.tier_name}>
                              <td>{tier.tier_name}</td>
                              <td>
                                {editing ? (
                                  <input
                                    className="form-input"
                                    type="number"
                                    value={tier.min_referrals ?? 0}
                                    onChange={(e) =>
                                      handleTierChange(index, 'min_referrals', e.target.value)
                                    }
                                  />
                                ) : (
                                  tier.min_referrals
                                )}
                              </td>
                              <td>
                                {editing ? (
                                  <input
                                    className="form-input"
                                    type="number"
                                    value={tier.referral_bonus_percentage ?? 0}
                                    onChange={(e) =>
                                      handleTierChange(index, 'referral_bonus_percentage', e.target.value)
                                    }
                                  />
                                ) : (
                                  tier.referral_bonus_percentage
                                )}
                              </td>
                              <td>
                                {editing ? (
                                  <input
                                    className="form-input"
                                    type="number"
                                    value={tier.cashback_percentage ?? 0}
                                    onChange={(e) =>
                                      handleTierChange(index, 'cashback_percentage', e.target.value)
                                    }
                                  />
                                ) : (
                                  tier.cashback_percentage
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
