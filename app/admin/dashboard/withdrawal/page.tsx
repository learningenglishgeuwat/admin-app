'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, X, Search, Eye } from 'lucide-react'
import { approveWithdrawalRequest, getWithdrawalRequestsWithUsers, rejectWithdrawalRequest } from '@/lib/supabase'
import type { WithdrawalRequest } from '@/types/database'

type WithdrawalWithUser = WithdrawalRequest & {
  users: {
    id: string
    fullname: string
    email: string
    balance: string | null
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'futuristic-badge futuristic-badge-warning'
    case 'approved':
      return 'futuristic-badge futuristic-badge-success'
    case 'rejected':
      return 'futuristic-badge futuristic-badge-danger'
    default:
      return 'futuristic-badge futuristic-badge-secondary'
  }
}

export default function WithdrawalPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [withdrawals, setWithdrawals] = useState<WithdrawalWithUser[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalWithUser | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const fetchWithdrawals = useCallback(async () => {
    try {
      setLoading(true)
      const options = {
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        search: searchQuery.trim() || undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize
      }
      const { withdrawals, count, error } = await getWithdrawalRequestsWithUsers(options)

      if (error) {
        setError(error.message)
      } else {
        setWithdrawals(withdrawals || [])
        setTotalCount(count ?? 0)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch withdrawals')
    } finally {
      setLoading(false)
    }
  }, [selectedStatus, searchQuery, page, pageSize])

  useEffect(() => {
    fetchWithdrawals()
  }, [fetchWithdrawals])

  useEffect(() => {
    setPage(1)
  }, [searchQuery, selectedStatus, pageSize])

  const handleApproveWithdrawal = useCallback(async (withdrawalId: string) => {
    try {
      const { error } = await approveWithdrawalRequest(withdrawalId)
      if (error) {
        setError(error.message)
        return
      }
      setWithdrawals(prev =>
        prev.map(w => (w.id === withdrawalId ? { ...w, status: 'approved' } : w))
      )
      if (selectedWithdrawal?.id === withdrawalId) {
        setSelectedWithdrawal({ ...selectedWithdrawal, status: 'approved' })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve withdrawal')
    }
  }, [selectedWithdrawal])

  const handleRejectWithdrawal = useCallback(async (withdrawalId: string) => {
    try {
      const { error } = await rejectWithdrawalRequest(withdrawalId)
      if (error) {
        setError(error.message)
        return
      }
      setWithdrawals(prev =>
        prev.map(w => (w.id === withdrawalId ? { ...w, status: 'rejected' } : w))
      )
      if (selectedWithdrawal?.id === withdrawalId) {
        setSelectedWithdrawal({ ...selectedWithdrawal, status: 'rejected' })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject withdrawal')
    }
  }, [selectedWithdrawal])

  const filteredWithdrawals = useMemo(() => withdrawals, [withdrawals])
  const rows = useMemo(() => (
    filteredWithdrawals.map((w) => (
      <tr key={w.id}>
        <td className="table-cell">
          <div>
            <div className="table-cell-primary">{w.users.fullname}</div>
            <div className="text-xs text-gray-400">{w.users.email}</div>
          </div>
        </td>
        <td className="table-cell">
          Rp {Number(w.amount || 0).toLocaleString('id-ID')}
        </td>
        <td className="table-cell">
          <span className={getStatusColor(w.status)}>{w.status}</span>
        </td>
        <td className="table-cell">{new Date(w.created_at).toLocaleDateString()}</td>
        <td className="table-cell">
          <div className="action-buttons">
            <button
              onClick={() => {
                setSelectedWithdrawal(w)
                setShowDetailModal(true)
              }}
              className="action-button action-button-view"
              title="View details"
            >
              <Eye className="action-icon" />
            </button>
            {w.status === 'pending' && (
              <>
                <button
                  onClick={() => handleApproveWithdrawal(w.id)}
                  className="action-button action-button-success"
                  title="Approve"
                >
                  <Check className="action-icon" />
                </button>
                <button
                  onClick={() => handleRejectWithdrawal(w.id)}
                  className="action-button action-button-ban"
                  title="Reject"
                >
                  <X className="action-icon" />
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
    ))
  ), [filteredWithdrawals, handleApproveWithdrawal, handleRejectWithdrawal])

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner-large"></div>
        <p>Loading withdrawals...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <div className="error-message">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-card">
        <div className="card-content">
          <div className="table-header">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name, email, status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input pl-10"
              />
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="form-select"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      <div className="dashboard-card">
        <div className="card-content table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredWithdrawals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="table-cell text-center text-gray-400 py-12">
                    No withdrawal requests found.
                  </td>
                </tr>
              ) : (
                rows
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pagination">
        <div className="pagination-info">
          Showing {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}-
          {Math.min(totalCount, page * pageSize)} of {totalCount}
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
            Page {page} of {Math.max(1, Math.ceil(totalCount / pageSize))}
          </span>
          <button
            className="pagination-button"
            onClick={() => setPage(prev => Math.min(Math.max(1, Math.ceil(totalCount / pageSize)), prev + 1))}
            disabled={page >= Math.max(1, Math.ceil(totalCount / pageSize))}
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

      {showDetailModal && selectedWithdrawal && (
        <div className="modal-overlay">
          <div className="modal-content modal-large">
            <div className="modal-header">
              <h2 className="modal-title">Withdrawal Detail</h2>
              <button onClick={() => setShowDetailModal(false)} className="modal-close">
                <X className="modal-close-icon" />
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <label className="detail-label">Request ID</label>
                  <p className="detail-value detail-value-mono">{selectedWithdrawal.id}</p>
                </div>
                <div className="detail-item">
                  <label className="detail-label">User ID</label>
                  <p className="detail-value detail-value-mono">{selectedWithdrawal.user_id}</p>
                </div>
                <div className="detail-item">
                  <label className="detail-label">Full Name</label>
                  <p className="detail-value">{selectedWithdrawal.users.fullname}</p>
                </div>
                <div className="detail-item">
                  <label className="detail-label">Email</label>
                  <p className="detail-value">{selectedWithdrawal.users.email}</p>
                </div>
                <div className="detail-item">
                  <label className="detail-label">Amount</label>
                  <p className="detail-value">Rp {Number(selectedWithdrawal.amount || 0).toLocaleString('id-ID')}</p>
                </div>
                <div className="detail-item">
                  <label className="detail-label">Status</label>
                  <span className={getStatusColor(selectedWithdrawal.status)}>{selectedWithdrawal.status}</span>
                </div>
                <div className="detail-item">
                  <label className="detail-label">Created</label>
                  <p className="detail-value">{new Date(selectedWithdrawal.created_at).toLocaleString()}</p>
                </div>
                <div className="detail-item">
                  <label className="detail-label">Current Balance</label>
                  <p className="detail-value">
                    Rp {Number(selectedWithdrawal.users.balance || 0).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              {selectedWithdrawal.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleApproveWithdrawal(selectedWithdrawal.id)}
                    className="modal-button modal-button-success"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleRejectWithdrawal(selectedWithdrawal.id)}
                    className="modal-button modal-button-danger"
                  >
                    Reject
                  </button>
                </>
              )}
              <button onClick={() => setShowDetailModal(false)} className="modal-button modal-button-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
