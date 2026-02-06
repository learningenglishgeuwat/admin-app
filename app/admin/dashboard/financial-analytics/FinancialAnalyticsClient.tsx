'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CreditCard, DollarSign, Gift, Minimize, Wallet } from 'lucide-react'
import {
  getActiveSubscriptionPrice,
  getExtensionRequests,
  getTransactionHistory,
  getUsers,
  getWithdrawalRequests
} from '@/lib/supabase'
import type { ExtensionRequest, TransactionHistory, User, WithdrawRequest } from '@/types/database'

export default function FinancialAnalyticsPage() {
  const [transactions, setTransactions] = useState<TransactionHistory[]>([])
  const [withdrawals, setWithdrawals] = useState<WithdrawRequest[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [extensions, setExtensions] = useState<ExtensionRequest[]>([])
  const [subscriptionPrice, setSubscriptionPrice] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFinancialData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [
        { transactions: txData },
        { withdrawals: wdData },
        { users: userData },
        { extensions: extData },
        { price }
      ] = await Promise.all([
        getTransactionHistory({ limit: 50 }),
        getWithdrawalRequests({ limit: 50 }),
        getUsers(),
        getExtensionRequests({ limit: 50 }),
        getActiveSubscriptionPrice()
      ])

      setTransactions(txData ?? [])
      setWithdrawals(wdData ?? [])
      setUsers(userData ?? [])
      setExtensions(extData ?? [])
      setSubscriptionPrice(Number(price?.price_cents ?? 0))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal memuat data finansial.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchFinancialData()
  }, [fetchFinancialData])

  const monthStart = useMemo(() => {
    const now = new Date()
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0))
  }, [])

  const monthlyNewMembers = useMemo(() => {
    return users.filter((u) => new Date(u.created_at) >= monthStart).length
  }, [users, monthStart])

  const monthlyApprovedExtensions = useMemo(() => {
    return extensions.filter((e) => {
      if (e.status !== 'approved') return false
      return new Date(e.updated_at) >= monthStart
    }).length
  }, [extensions, monthStart])

  const totals = useMemo(() => {
    let income = 0
    let expense = 0
    let cashback = 0
    let referralBonus = 0
    let customReward = 0

    for (const tx of transactions) {
      const amount = Number(tx.amount || 0)
      const type = tx.type || ''
      expense += amount

      income += amount

      if (type === 'cashback' || type === 'cashback_extension') {
        cashback += amount
      }
      if (type === 'referral_bonus' || type === 'referral_bonus_extension') {
        referralBonus += amount
      }
      if (type === 'custom') {
        customReward += amount
      }
    }

    const subscriptionIncome =
      Number(subscriptionPrice || 0) * (monthlyNewMembers + monthlyApprovedExtensions)

    return { income, expense, cashback, referralBonus, customReward, subscriptionIncome }
  }, [
    transactions,
    subscriptionPrice,
    monthlyNewMembers,
    monthlyApprovedExtensions
  ])

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Financial Analytics</h1>
          <p className="page-subtitle">Ringkasan transaksi dan performa finansial.</p>
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
              <Minimize className="registration-icon-error" />
              <div>
                <h3 className="registration-error-title">Terjadi Kesalahan</h3>
                <p className="registration-error-text">{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="summary-cards">
            <div className="dashboard-card">
              <div className="card-content">
                <div className="flex items-center gap-3">
                  <div className="analytics-icon analytics-icon-success">
                    <DollarSign className="analytics-icon-svg" />
                  </div>
                  <div>
                    <div className="analytics-title">Total Income</div>
                    <div className="analytics-value">{totals.subscriptionIncome}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="dashboard-card">
              <div className="card-content">
                <div className="flex items-center gap-3">
                  <div className="analytics-icon analytics-icon-error">
                    <Wallet className="analytics-icon-svg" />
                  </div>
                  <div>
                    <div className="analytics-title">Total Expense</div>
                    <div className="analytics-value">{totals.expense}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="dashboard-card">
              <div className="card-content">
                <div className="flex items-center gap-3">
                  <div className="analytics-icon analytics-icon-success">
                    <Gift className="analytics-icon-svg" />
                  </div>
                  <div>
                    <div className="analytics-title">Total Cashback</div>
                    <div className="analytics-value">{totals.cashback}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="dashboard-card">
              <div className="card-content">
                <div className="flex items-center gap-3">
                  <div className="analytics-icon analytics-icon-info">
                    <CreditCard className="analytics-icon-svg" />
                  </div>
                  <div>
                    <div className="analytics-title">Total Referral Bonus</div>
                    <div className="analytics-value">{totals.referralBonus}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="dashboard-card">
              <div className="card-content">
                <div className="flex items-center gap-3">
                  <div className="analytics-icon analytics-icon-info">
                    <Gift className="analytics-icon-svg" />
                  </div>
                  <div>
                    <div className="analytics-title">Total Custom Reward</div>
                    <div className="analytics-value">{totals.customReward}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="summary-cards">
            <div className="dashboard-card">
              <div className="card-content">
                <div className="flex items-center gap-3">
                  <div className="analytics-icon analytics-icon-success">
                    <Minimize className="analytics-icon-svg" />
                  </div>
                  <div>
                    <div className="analytics-title">Total New Member</div>
                    <div className="analytics-value">{monthlyNewMembers}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="dashboard-card">
              <div className="card-content">
                <div className="flex items-center gap-3">
                  <div className="analytics-icon analytics-icon-info">
                    <Gift className="analytics-icon-svg" />
                  </div>
                  <div>
                    <div className="analytics-title">Total Extended Member</div>
                    <div className="analytics-value">{monthlyApprovedExtensions}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </>
      )}
    </div>
  )
}
