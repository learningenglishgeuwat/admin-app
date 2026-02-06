'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, Check, X, Eye, Link as LinkIcon } from 'lucide-react'
import { approveExtensionRequest, getExtensionRequestsWithUsers, updateExtensionRequest } from '@/lib/supabase'
import type { ExtensionRequest } from '@/types/database'

type ExtensionRequestWithUser = ExtensionRequest & {
  users: {
    id: string
    fullname: string
    email: string
    tier: string
    referred_by: string | null
    subscription_expires_at: string | null
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

export default function ExtendedMembersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [extensions, setExtensions] = useState<ExtensionRequestWithUser[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedExtension, setSelectedExtension] = useState<ExtensionRequestWithUser | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  useEffect(() => {
    setPage(1)
  }, [searchQuery, pageSize])

  const fetchExtensions = useCallback(async () => {
    try {
      setLoading(true)
      const { extensions, count, error } = await getExtensionRequestsWithUsers({
        search: searchQuery.trim() || undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize
      })

      if (error) {
        setError(error.message)
      } else {
        setExtensions(extensions || [])
        setTotalCount(count ?? 0)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch extension requests')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, searchQuery])

  useEffect(() => {
    fetchExtensions()
  }, [fetchExtensions])

  const handleUpdateStatus = useCallback(async (extensionId: string, status: 'approved' | 'rejected') => {
    try {
      if (status === 'approved') {
        const { error } = await approveExtensionRequest(extensionId)
        if (error) {
          setError(error.message)
          return
        }
      } else {
        const { error } = await updateExtensionRequest(extensionId, { status })
        if (error) {
          setError(error.message)
          return
        }
      }

      setExtensions(prev =>
        prev.map(e => (e.id === extensionId ? { ...e, status, updated_at: new Date().toISOString() } : e))
      )
      if (selectedExtension?.id === extensionId) {
        setSelectedExtension({ ...selectedExtension, status, updated_at: new Date().toISOString() })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    }
  }, [selectedExtension])

  const filteredExtensions = useMemo(() => extensions, [extensions])
  const rows = useMemo(() => (
    filteredExtensions.map((ext) => (
      <tr key={ext.id}>
        <td className="table-cell">
          <div>
            <div className="table-cell-primary">{ext.users.fullname}</div>
            <div className="text-xs text-gray-400">{ext.users.email}</div>
          </div>
        </td>
        <td className="table-cell">
          <span className={getStatusColor(ext.status)}>{ext.status}</span>
        </td>
        <td className="table-cell">{ext.payment_method || '-'}</td>
        <td className="table-cell">
          {ext.proof_url ? (
            <a className="btn btn-secondary btn-sm" href={ext.proof_url} target="_blank" rel="noreferrer">
              <LinkIcon className="w-4 h-4" />
            </a>
          ) : (
            '-'
          )}
        </td>
        <td className="table-cell max-w-xs">
          <div className="truncate" title={ext.note || ''}>
            {ext.note || '-'}
          </div>
        </td>
        <td className="table-cell">{new Date(ext.created_at).toLocaleDateString()}</td>
        <td className="table-cell">{new Date(ext.updated_at).toLocaleDateString()}</td>
        <td className="table-cell">
          <div className="action-buttons">
            <button
              onClick={() => {
                setSelectedExtension(ext)
                setShowDetailModal(true)
              }}
              className="action-button action-button-view"
              title="View details"
            >
              <Eye className="action-icon" />
            </button>
            {ext.status === 'pending' && (
              <>
                <button
                  onClick={() => handleUpdateStatus(ext.id, 'approved')}
                  className="action-button action-button-success"
                  title="Approve"
                >
                  <Check className="action-icon" />
                </button>
                <button
                  onClick={() => handleUpdateStatus(ext.id, 'rejected')}
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
  ), [filteredExtensions, handleUpdateStatus])

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner-large"></div>
        <p>Loading extension requests...</p>
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
                placeholder="Search by user, status, note..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-card">
        <div className="card-content table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Proof</th>
                <th>Note</th>
                <th>Created</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExtensions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="table-cell text-center text-gray-400 py-12">
                    No extension requests found.
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

      {showDetailModal && selectedExtension && (
        <div className="modal-overlay">
          <div className="modal-content modal-large">
            <div className="modal-header">
              <h2 className="modal-title">Extension Request Detail</h2>
              <button onClick={() => setShowDetailModal(false)} className="modal-close">
                <X className="modal-close-icon" />
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <label className="detail-label">Request ID</label>
                  <p className="detail-value detail-value-mono">{selectedExtension.id}</p>
                </div>
                <div className="detail-item">
                  <label className="detail-label">User ID</label>
                  <p className="detail-value detail-value-mono">{selectedExtension.user_id}</p>
                </div>
                <div className="detail-item">
                  <label className="detail-label">Full Name</label>
                  <p className="detail-value">{selectedExtension.users.fullname}</p>
                </div>
                <div className="detail-item">
                  <label className="detail-label">Email</label>
                  <p className="detail-value">{selectedExtension.users.email}</p>
                </div>
                <div className="detail-item">
                  <label className="detail-label">Status</label>
                  <span className={getStatusColor(selectedExtension.status)}>{selectedExtension.status}</span>
                </div>
                <div className="detail-item">
                  <label className="detail-label">Payment Method</label>
                  <p className="detail-value">{selectedExtension.payment_method || '-'}</p>
                </div>
                <div className="detail-item">
                  <label className="detail-label">Proof URL</label>
                  {selectedExtension.proof_url ? (
                    <a className="btn btn-secondary btn-sm" href={selectedExtension.proof_url} target="_blank" rel="noreferrer">
                      Open Proof
                    </a>
                  ) : (
                    <p className="detail-value">-</p>
                  )}
                </div>
                <div className="detail-item">
                  <label className="detail-label">Note</label>
                  <p className="detail-value">{selectedExtension.note || '-'}</p>
                </div>
                <div className="detail-item">
                  <label className="detail-label">Created</label>
                  <p className="detail-value">{new Date(selectedExtension.created_at).toLocaleString()}</p>
                </div>
                <div className="detail-item">
                  <label className="detail-label">Updated</label>
                  <p className="detail-value">{new Date(selectedExtension.updated_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              {selectedExtension.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleUpdateStatus(selectedExtension.id, 'approved')}
                    className="modal-button modal-button-success"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedExtension.id, 'rejected')}
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
