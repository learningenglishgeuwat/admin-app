'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { CheckCircle, PlusCircle, XCircle } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase'
import type { CustomReward, User } from '@/types/database'

type RewardRow = CustomReward & {
  users?: Pick<User, 'id' | 'fullname' | 'email'>
}

export default function CustomRewardPage() {
  const [rewards, setRewards] = useState<RewardRow[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    user_id: '',
    amount: '',
    note: ''
  })

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [{ data: rewardData, error: rewardError }, { data: userData, error: userError }] =
        await Promise.all([
          supabaseAdmin
            .from('custom_rewards')
            .select('*, users:users(id, fullname, email)')
            .order('created_at', { ascending: false }),
          supabaseAdmin.from('users').select('*').order('created_at', { ascending: false })
        ])

      if (rewardError) throw rewardError
      if (userError) throw userError

      setRewards((rewardData ?? []) as RewardRow[])
      setUsers((userData ?? []) as User[])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal memuat data.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const userOptions = useMemo(
    () =>
      users.map((u) => ({
        value: u.id,
        label: `${u.fullname} (${u.email})`
      })),
    [users]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      if (!form.user_id || !form.amount) {
        setError('User dan amount wajib diisi.')
        return
      }

      const amount = Number(form.amount)
      if (Number.isNaN(amount) || amount <= 0) {
        setError('Amount tidak valid.')
        return
      }

      const { error: insertError } = await supabaseAdmin
        .from('custom_rewards')
        .insert({
          user_id: form.user_id,
          amount,
          note: form.note || null,
          status: 'approved'
        })

      if (insertError) {
        throw new Error(insertError.message)
      }

      setForm({ user_id: '', amount: '', note: '' })
      setSuccess('Custom reward berhasil ditambahkan.')
      await loadData()
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Gagal menyimpan reward.'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Custom Reward</h1>
          <p className="page-subtitle">Kelola reward manual untuk member.</p>
        </div>
      </div>

      {error && (
        <div className="dashboard-card registration-error-card">
          <div className="card-content">
            <div className="registration-row">
              <XCircle className="registration-icon-error" />
              <div>
                <h3 className="registration-error-title">Terjadi Kesalahan</h3>
                <p className="registration-error-text">{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {success && (
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

      <div className="dashboard-card">
        <div className="card-header">
          <h2 className="card-title">Tambah Reward</h2>
        </div>
        <div className="card-content">
          <form className="registration-form" onSubmit={handleSubmit}>
            <div className="registration-grid">
              <div>
                <label className="form-label">Member</label>
                <select
                  className="form-select"
                  value={form.user_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, user_id: e.target.value }))}
                  required
                >
                  <option value="">Pilih member</option>
                  {userOptions.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Amount</label>
                <input
                  className="form-input"
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder="10000"
                  required
                />
              </div>
              <div>
                <label className="form-label">Status</label>
                <div className="form-input">Approved (otomatis)</div>
              </div>
            </div>
            <div>
              <label className="form-label">Catatan</label>
              <textarea
                className="form-textarea"
                value={form.note}
                onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="Catatan reward..."
                rows={3}
              />
            </div>
            <div className="registration-form-actions">
              <button className="btn btn-primary" type="submit" disabled={saving}>
                <PlusCircle className="btn-icon" />
                {saving ? 'Menyimpan...' : 'Tambah Reward'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="dashboard-card">
        <div className="card-header">
          <h2 className="card-title">Daftar Reward</h2>
        </div>
        <div className="card-content">
          {loading ? (
            <div className="loading-content">
              <div className="loading-spinner-large" />
              <div className="loading-text">Memuat data...</div>
            </div>
          ) : rewards.length === 0 ? (
            <div className="empty-state">Belum ada custom reward.</div>
          ) : (
            <div className="table-responsive data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Email</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Catatan</th>
                    <th>Tanggal</th>
                  </tr>
                </thead>
                <tbody>
                  {rewards.map((reward) => (
                    <tr key={reward.id}>
                      <td>{reward.users?.fullname || '-'}</td>
                      <td>{reward.users?.email || '-'}</td>
                      <td>{reward.amount}</td>
                      <td>{reward.status}</td>
                      <td>{reward.note || '-'}</td>
                      <td>{new Date(reward.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
