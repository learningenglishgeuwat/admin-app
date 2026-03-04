'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Save } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase'
import type { Database } from '@/types/database'

type TierRow = Database['public']['Tables']['tiers']['Row']
type SpecialOfferSettingsRow = Database['public']['Tables']['special_offer_settings']['Row']
type SpecialOfferTierRow = Database['public']['Tables']['special_offer_tiers']['Row']

type SpecialOfferForm = {
  offerName: string
  priceAmount: string
  durationMonths: number
  referralCommission: string
  cashbackCommission: string
  selectedTiers: string[]
}

const normalizeDigits = (value: string) => value.replace(/\D/g, '')

const formatThousandsWithDot = (rawValue: string) => {
  const digits = normalizeDigits(rawValue)
  if (!digits) return ''
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

const SPECIAL_OFFER_KEY = 'default'
const DEFAULT_FORM: SpecialOfferForm = {
  offerName: '',
  priceAmount: '100000',
  durationMonths: 6,
  referralCommission: '7',
  cashbackCommission: '5',
  selectedTiers: []
}

export default function SpecialOfferPage() {
  const [form, setForm] = useState<SpecialOfferForm>(DEFAULT_FORM)
  const [availableTiers, setAvailableTiers] = useState<TierRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const durationOptions = useMemo(
    () => Array.from({ length: 12 }, (_, index) => index + 1),
    []
  )
  const formattedPriceAmount = useMemo(
    () => formatThousandsWithDot(form.priceAmount),
    [form.priceAmount]
  )

  useEffect(() => {
    void loadData(true)
  }, [])

  const loadData = async (showLoader: boolean) => {
    if (showLoader) setLoading(true)

    try {
      setError(null)

      const [settingsResult, tiersResult, selectedTiersResult] = await Promise.all([
        supabaseAdmin
          .from('special_offer_settings')
          .select('*')
          .eq('key', SPECIAL_OFFER_KEY)
          .maybeSingle(),
        supabaseAdmin
          .from('tiers')
          .select('*')
          .order('min_referrals', { ascending: true }),
        supabaseAdmin
          .from('special_offer_tiers')
          .select('*')
          .eq('settings_key', SPECIAL_OFFER_KEY)
      ])

      if (settingsResult.error) throw settingsResult.error
      if (tiersResult.error) throw tiersResult.error
      if (selectedTiersResult.error) throw selectedTiersResult.error

      const settings = settingsResult.data as SpecialOfferSettingsRow | null
      const tiers = (tiersResult.data ?? []) as TierRow[]
      const selectedTierRows = (selectedTiersResult.data ?? []) as SpecialOfferTierRow[]
      const selectedTierNames = selectedTierRows.map((item) => item.tier_name)

      setAvailableTiers(tiers)
      setForm({
        offerName: settings?.offer_name ?? DEFAULT_FORM.offerName,
        priceAmount: String(settings?.price_amount ?? DEFAULT_FORM.priceAmount),
        durationMonths: settings?.duration_months ?? DEFAULT_FORM.durationMonths,
        referralCommission:
          settings?.referral_commission_pct ?? DEFAULT_FORM.referralCommission,
        cashbackCommission:
          settings?.cashback_commission_pct ?? DEFAULT_FORM.cashbackCommission,
        selectedTiers: selectedTierNames
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal memuat special offer.'
      setError(message)
    } finally {
      if (showLoader) setLoading(false)
    }
  }

  const toggleTier = (tier: string, checked: boolean) => {
    setForm((prev) => {
      if (checked) {
        if (prev.selectedTiers.includes(tier)) return prev
        return {
          ...prev,
          selectedTiers: [...prev.selectedTiers, tier]
        }
      }

      return {
        ...prev,
        selectedTiers: prev.selectedTiers.filter((value) => value !== tier)
      }
    })
  }

  const handleSave = async () => {
    setError(null)
    setSuccess(null)

    const offerName = form.offerName.trim()
    if (!offerName) {
      setError('Nama produk wajib diisi.')
      return
    }

    const priceAmount = Number(form.priceAmount)
    if (!Number.isInteger(priceAmount) || priceAmount < 0) {
      setError('Harga produk wajib bilangan bulat dan tidak boleh negatif.')
      return
    }

    if (form.durationMonths < 1 || form.durationMonths > 12) {
      setError('Durasi harus antara 1 sampai 12 bulan.')
      return
    }

    const referralCommission = Number(form.referralCommission)
    if (Number.isNaN(referralCommission) || referralCommission < 0 || referralCommission > 100) {
      setError('Komisi referral harus di antara 0 sampai 100.')
      return
    }

    const cashbackCommission = Number(form.cashbackCommission)
    if (Number.isNaN(cashbackCommission) || cashbackCommission < 0 || cashbackCommission > 100) {
      setError('Komisi cashback harus di antara 0 sampai 100.')
      return
    }

    if (form.selectedTiers.length === 0) {
      setError('Minimal pilih satu tier.')
      return
    }

    const tierSet = new Set(availableTiers.map((tier) => tier.tier_name))
    const validSelectedTiers = form.selectedTiers.filter((tier) => tierSet.has(tier))

    if (validSelectedTiers.length === 0) {
      setError('Tier yang dipilih tidak valid.')
      return
    }

    setSaving(true)

    try {
      const settingsPayload: Database['public']['Tables']['special_offer_settings']['Insert'] = {
        key: SPECIAL_OFFER_KEY,
        offer_name: offerName,
        price_amount: priceAmount,
        currency: 'IDR',
        duration_months: form.durationMonths,
        referral_commission_pct: referralCommission.toFixed(2),
        cashback_commission_pct: cashbackCommission.toFixed(2),
        counts_for_tier_progress: false,
        is_active: true
      }

      const { error: upsertError } = await supabaseAdmin
        .from('special_offer_settings')
        .upsert(settingsPayload, { onConflict: 'key' })

      if (upsertError) throw upsertError

      const { error: deleteError } = await supabaseAdmin
        .from('special_offer_tiers')
        .delete()
        .eq('settings_key', SPECIAL_OFFER_KEY)

      if (deleteError) throw deleteError

      const tierRows: Database['public']['Tables']['special_offer_tiers']['Insert'][] =
        validSelectedTiers.map((tierName) => ({
          settings_key: SPECIAL_OFFER_KEY,
          tier_name: tierName
        }))

      const { error: insertError } = await supabaseAdmin
        .from('special_offer_tiers')
        .insert(tierRows)

      if (insertError) throw insertError

      await loadData(false)
      setSuccess('Special offer berhasil disimpan.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal menyimpan special offer.'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Special Offer</h1>
          <p className="page-subtitle">Kelola konfigurasi special offer untuk referral.</p>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-primary"
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
          >
            <Save className="btn-icon" />
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
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

      {success && !error && (
        <div className="dashboard-card registration-success-card">
          <div className="card-content">
            <div className="registration-row">
              <CheckCircle2 className="registration-icon-success" />
              <div>
                <h3 className="registration-success-title">Sukses</h3>
                <p className="registration-success-text">{success}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && (
        <div className="dashboard-card">
          <div className="card-header">
            <h2 className="card-title">Form Special Offer</h2>
          </div>
          <div className="card-content">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="form-label" htmlFor="special-offer-name">Nama Produk</label>
                <input
                  id="special-offer-name"
                  className="form-input"
                  placeholder="Contoh: Program 6 Bulan"
                  value={form.offerName}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, offerName: event.target.value }))
                  }
                />
              </div>

              <div>
                <label className="form-label" htmlFor="special-offer-price">Harga Produk (IDR)</label>
                <input
                  id="special-offer-price"
                  className="form-input"
                  type="text"
                  inputMode="numeric"
                  value={formattedPriceAmount}
                  placeholder="100.000"
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      priceAmount: normalizeDigits(event.target.value)
                    }))
                  }
                />
              </div>

              <div>
                <label className="form-label" htmlFor="special-offer-duration">Durasi (bulan)</label>
                <select
                  id="special-offer-duration"
                  className="form-select"
                  value={form.durationMonths}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      durationMonths: Number(event.target.value)
                    }))
                  }
                >
                  {durationOptions.map((month) => (
                    <option key={month} value={month}>
                      {month} bulan
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" htmlFor="special-offer-referral">Komisi Referral untuk Referrer (%)</label>
                <input
                  id="special-offer-referral"
                  className="form-input"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.referralCommission}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, referralCommission: event.target.value }))
                  }
                />
              </div>

              <div>
                <label className="form-label" htmlFor="special-offer-cashback">Komisi Cashback untuk Member (%)</label>
                <input
                  id="special-offer-cashback"
                  className="form-input"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.cashbackCommission}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, cashbackCommission: event.target.value }))
                  }
                />
              </div>

              <div>
                <label className="form-label">Pilihan Tier</label>
                <div className="grid gap-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-3">
                  {availableTiers.map((tier) => (
                    <label key={tier.tier_name} className="flex items-center gap-2 text-sm text-white">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-cyan-500"
                        checked={form.selectedTiers.includes(tier.tier_name)}
                        onChange={(event) => toggleTier(tier.tier_name, event.target.checked)}
                      />
                      <span>{tier.tier_name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
