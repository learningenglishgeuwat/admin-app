'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, Filter, Download, Calendar, CheckCircle, Clock, X } from 'lucide-react'
import { getTransactionHistory, getUsers } from '@/lib/supabase'
import type { TransactionHistory } from '@/types/database'
import type { User as UserType } from '@/types/database'

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'status-badge status-completed'
    case 'pending':
      return 'status-badge status-pending'
    case 'failed':
      return 'status-badge status-failed'
    default:
      return 'status-badge status-inactive'
  }
}

const getTransactionTypeColor = (type: string) => {
  switch (type) {
    case 'cashback':
    case 'cashback_extension':
      return 'status-badge status-paid'
    case 'referral_bonus':
    case 'referral_bonus_extension':
      return 'status-badge status-completed'
    case 'withdrawal':
      return 'status-badge status-pending'
    case 'custom_reward':
      return 'status-badge status-active'
    default:
      return 'status-badge status-inactive'
  }
}

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'referral_bonus':
      return 'Referral Bonus'
    case 'referral_bonus_extension':
      return 'Referral Bonus (Extension)'
    case 'cashback':
      return 'Cashback'
    case 'cashback_extension':
      return 'Cashback (Extension)'
    case 'withdrawal':
      return 'Withdrawal'
    case 'custom_reward':
      return 'Custom Reward'
    default:
      return type
  }
}

export default function HistoryPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSection, setActiveSection] = useState('all')

  // Data states
  const [transactions, setTransactions] = useState<TransactionHistory[]>([])
  const [users, setUsers] = useState<UserType[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setPage(1)
  }, [searchQuery, activeSection, pageSize])

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true)
      const { transactions, count, error } = await getTransactionHistory({
        type: activeSection === 'all' ? undefined : activeSection,
        limit: pageSize,
        offset: (page - 1) * pageSize,
        search: searchQuery.trim() || undefined
      })
      
      if (error) {
        setError(error.message)
      } else {
        setTransactions(transactions || [])
        setTotalCount(count ?? 0)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transaction history')
    } finally {
      setLoading(false)
    }
  }, [activeSection, page, pageSize, searchQuery])

  const fetchUsers = useCallback(async () => {
    try {
      const { users, error } = await getUsers()
      
      if (error) {
        console.error('Failed to fetch users:', error)
      } else {
        setUsers(users || [])
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
    fetchUsers()
  }, [fetchHistory, fetchUsers])

  // Group transactions by type
  const getTransactionsByType = useCallback((type: string) => {
    return transactions.filter(t => t.type === type)
  }, [transactions])

  const getFilteredTransactions = useCallback(() => transactions, [transactions])

  const getUserInfo = useCallback((userId: string) => {
    const user = users.find(u => u.id === userId)
    return user ? {
      name: user.fullname,
      email: user.email,
      tier: user.tier
    } : { name: 'Unknown', email: 'Unknown', tier: 'Unknown' }
  }, [users])

  const getTransactionStats = useCallback(() => {
    const stats = {
      total: transactions.length,
      completed: transactions.filter(t => t.status === 'completed').length,
      pending: transactions.filter(t => t.status === 'pending').length,
      failed: transactions.filter(t => t.status === 'failed').length,
      byType: {
        cashback: getTransactionsByType('cashback').reduce((sum, t) => sum + Number(t.amount || 0), 0)
          + getTransactionsByType('cashback_extension').reduce((sum, t) => sum + Number(t.amount || 0), 0),
        referral: getTransactionsByType('referral_bonus').reduce((sum, t) => sum + Number(t.amount || 0), 0)
          + getTransactionsByType('referral_bonus_extension').reduce((sum, t) => sum + Number(t.amount || 0), 0),
        withdrawal: getTransactionsByType('withdrawal').reduce((sum, t) => sum + Number(t.amount || 0), 0),
        custom: getTransactionsByType('custom_reward').reduce((sum, t) => sum + Number(t.amount || 0), 0)
      }
    }
    return stats
  }, [transactions, getTransactionsByType])

  const stats = useMemo(() => getTransactionStats(), [getTransactionStats])
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const startIndex = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const endIndex = Math.min(totalCount, page * pageSize)

  const transactionRows = useMemo(() => (
    getFilteredTransactions().map((transaction) => {
      const userInfo = getUserInfo(transaction.user_id)
      return (
        <tr key={transaction.id}>
          <td className="table-cell">{transaction.id}</td>
          <td className="table-cell">
            <span className={getTransactionTypeColor(transaction.type)}>
              {getTypeLabel(transaction.type)}
            </span>
          </td>
          <td className="table-cell">
            Rp {Number(transaction.amount || 0).toLocaleString('id-ID')}
          </td>
          <td className="table-cell">
            <div>
              <div className="font-medium">{userInfo.name}</div>
              <div className="text-sm text-gray-400">{userInfo.email}</div>
            </div>
          </td>
          <td className="table-cell">
            {new Date(transaction.created_at).toLocaleDateString()}
          </td>
          <td className="table-cell">
            <span className={getStatusColor(transaction.status)}>
              {transaction.status}
            </span>
          </td>
          <td className="table-cell">{userInfo.tier || 'N/A'}</td>
        </tr>
      )
    })
  ), [getFilteredTransactions, getUserInfo])

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-content">
          <div className="loading-spinner-large"></div>
          <p>Loading transaction history...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <div className="error-message">
          Error: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      {/* Summary Stats */}
      <div className="analytics-grid">
        <div className="analytics-card">
          <div className="card-header">
            <div className="analytics-icon from-blue-500 to-cyan-600">
              <Calendar className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="analytics-value">{stats.total}</h3>
          <p className="analytics-title">Total Transactions</p>
          <p className="analytics-description">All transactions</p>
        </div>
        <div className="analytics-card">
          <div className="card-header">
            <div className="analytics-icon from-green-500 to-emerald-600">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="analytics-value">{stats.completed}</h3>
          <p className="analytics-title">Completed</p>
          <p className="analytics-description">Successful transactions</p>
        </div>
        <div className="analytics-card">
          <div className="card-header">
            <div className="analytics-icon from-yellow-500 to-orange-600">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="analytics-value">{stats.pending}</h3>
          <p className="analytics-title">Pending</p>
          <p className="analytics-description">Pending transactions</p>
        </div>
        <div className="analytics-card">
          <div className="card-header">
            <div className="analytics-icon from-red-500 to-red-700">
              <X className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="analytics-value">{stats.failed}</h3>
          <p className="analytics-title">Failed</p>
          <p className="analytics-description">Failed transactions</p>
        </div>
        
      </div>

      {/* Transaction List */}
      <div className="dashboard-card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="analytics-section-title">Transaction List</h2>
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input pl-10"
              />
            </div>
            <button className="btn btn-secondary btn-sm flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filter
            </button>
            <button className="btn btn-secondary btn-sm flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Type Filters */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveSection('all')}
            className={`btn btn-sm ${activeSection === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          >
            All
          </button>
          <button
            onClick={() => setActiveSection('referral_bonus')}
            className={`btn btn-sm ${activeSection === 'referral_bonus' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Referral Bonus
          </button>
          <button
            onClick={() => setActiveSection('cashback')}
            className={`btn btn-sm ${activeSection === 'cashback' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Cashback
          </button>
          <button
            onClick={() => setActiveSection('cashback_extension')}
            className={`btn btn-sm ${activeSection === 'cashback_extension' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Cashback (Ext)
          </button>
          <button
            onClick={() => setActiveSection('withdrawal')}
            className={`btn btn-sm ${activeSection === 'withdrawal' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Withdrawal
          </button>
          <button
            onClick={() => setActiveSection('custom_reward')}
            className={`btn btn-sm ${activeSection === 'custom_reward' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Custom Reward
          </button>
        </div>

        {/* Transaction Table */}
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Amount</th>
                <th>User</th>
                <th>Date</th>
                <th>Status</th>
                <th>Tier</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="table-cell text-center text-gray-400 py-12">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                transactionRows
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <div className="pagination-info">
            Showing {startIndex}-{endIndex} of {totalCount}
          </div>
          <div className="pagination-controls">
            <button
              className="pagination-button"
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <span className="pagination-page">
              Page {page} of {totalPages}
            </span>
            <button
              className="pagination-button"
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
            >
              Next
            </button>
            <select
              className="pagination-select"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
