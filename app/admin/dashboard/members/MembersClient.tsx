'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { 
  Search, 
  Filter, 
  Eye, 
  X, 
  Ban, 
  Pause, 
  User as UserIcon, 
  Calendar, 
  DollarSign, 
  Gift, 
  Target, 
  Award, 
  CreditCard 
} from 'lucide-react'
import { adminGetUsers, adminUpdateUserStatus, adminUpdateUserRole, adminUpdateUserTier, adminUpdateUserStatusAndExpiration, adminMarkPaidWithBonus } from '@/lib/adminSupabase'
import type { User } from '@/types/database'

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'futuristic-badge futuristic-badge-success'
    case 'paid':
      return 'futuristic-badge futuristic-badge-info'
    case 'unpaid':
      return 'futuristic-badge futuristic-badge-warning'
    case 'inactive':
      return 'futuristic-badge futuristic-badge-secondary'
    case 'ban':
      return 'futuristic-badge futuristic-badge-danger'
    case 'suspend':
      return 'futuristic-badge futuristic-badge-warning'
    default:
      return 'futuristic-badge futuristic-badge-secondary'
  }
}

const getTierColor = (tier: string) => {
  switch (tier) {
    case 'Legend':
      return 'futuristic-badge futuristic-badge-cyber'
    case 'Pro':
      return 'futuristic-badge futuristic-badge-info'
    case 'Rookie':
      return 'futuristic-badge futuristic-badge-success'
    default:
      return 'futuristic-badge futuristic-badge-secondary'
  }
}

const getSubscriptionStatus = (subscriptionExpiresAt: string | null) => {
  if (!subscriptionExpiresAt) {
    return {
      status: 'no-expiration',
      label: 'No Expiration',
      color: 'text-gray-400',
      icon: '⚪'
    }
  }

  const now = new Date()
  const expiryDate = new Date(subscriptionExpiresAt)
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntilExpiry < 0) {
    const daysOverdue = Math.abs(daysUntilExpiry)
    return {
      status: 'expired',
      label: `Expired ${daysOverdue} days ago (${expiryDate.toLocaleDateString()})`,
      color: 'text-red-500',
      icon: '🔴'
    }
  }
  if (daysUntilExpiry <= 7) {
    return {
      status: 'expiring-soon',
      label: `${daysUntilExpiry} days left (${expiryDate.toLocaleDateString()})`,
      color: 'text-yellow-500',
      icon: '🟡'
    }
  }
  return {
    status: 'active',
    label: `${daysUntilExpiry} days left (${expiryDate.toLocaleDateString()})`,
    color: 'text-green-500',
    icon: '🟢'
  }
}

export default function MembersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [tierFilter, setTierFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const calculateExtendedExpiration = (currentExpiration: string | null) => {
    const now = new Date()
    const baseDate = currentExpiration ? new Date(currentExpiration) : null
    const startDate = baseDate && baseDate > now ? baseDate : now
    const newExpirationDate = new Date(startDate)
    newExpirationDate.setDate(newExpirationDate.getDate() + 30)
    return newExpirationDate
  }

  useEffect(() => {
    setPage(1)
  }, [searchQuery, statusFilter, tierFilter, roleFilter, pageSize])

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const { users, count, error } = await adminGetUsers({
        search: searchQuery.trim() || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        tier: tierFilter === 'all' ? undefined : tierFilter,
        role: roleFilter === 'all' ? undefined : roleFilter,
        limit: pageSize,
        offset: (page - 1) * pageSize
      })
      if (error) {
        setError(error.message)
      } else {
        setUsers(users || [])
        setTotalCount(count ?? 0)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, searchQuery, statusFilter, tierFilter, roleFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleSuspendUser = useCallback(async (userId: string) => {
    try {
      const { error } = await adminUpdateUserStatus(userId, 'suspend')
      if (error) {
        setError(error.message)
      } else {
        // Update local state
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'suspend' } : u))
        if (selectedUser?.id === userId) {
          setSelectedUser({ ...selectedUser, status: 'suspend' })
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to suspend user')
    }
  }, [selectedUser])

  const handleBanUser = useCallback(async (userId: string) => {
    try {
      const { error } = await adminUpdateUserStatus(userId, 'ban')
      if (error) {
        setError(error.message)
      } else {
        // Update local state
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'ban' } : u))
        if (selectedUser?.id === userId) {
          setSelectedUser({ ...selectedUser, status: 'ban' })
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to ban user')
    }
  }, [selectedUser])

  const handleActivateUser = useCallback(async (userId: string) => {
    try {
      const { error } = await adminUpdateUserStatus(userId, 'active')
      if (error) {
        setError(error.message)
      } else {
        // Update local state
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'active' } : u))
        if (selectedUser?.id === userId) {
          setSelectedUser({ ...selectedUser, status: 'active' })
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate user')
    }
  }, [selectedUser])

  const handleUnsuspendUser = useCallback(async (userId: string) => {
    try {
      const { error } = await adminUpdateUserStatus(userId, 'active')
      if (error) {
        setError(error.message)
      } else {
        // Update local state
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'active' } : u))
        if (selectedUser?.id === userId) {
          setSelectedUser({ ...selectedUser, status: 'active' })
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unsuspend user')
    }
  }, [selectedUser])

  const handleUnbanUser = useCallback(async (userId: string) => {
    try {
      const { error } = await adminUpdateUserStatus(userId, 'active')
      if (error) {
        setError(error.message)
      } else {
        // Update local state
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'active' } : u))
        if (selectedUser?.id === userId) {
          setSelectedUser({ ...selectedUser, status: 'active' })
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unban user')
    }
  }, [selectedUser])

  const handleMarkPaidUser = useCallback(async (userId: string) => {
    try {
      const { user, expiration, referrerId, referralBonusAmount, cashbackAmount, error } = await adminMarkPaidWithBonus(userId)
      if (error) {
        setError(error.message)
        return
      }
      if (!user) {
        setError('User tidak ditemukan')
        return
      }

      // Update local state for member
      setUsers(prev => prev.map(u => 
        u.id === userId 
          ? { ...u, ...user, subscription_expires_at: expiration } 
          : u
      ))
      if (selectedUser?.id === userId) {
        setSelectedUser({ ...selectedUser, ...user, subscription_expires_at: expiration })
      }

      // Update referrer balance if in list
      if (referrerId && referralBonusAmount > 0) {
        setUsers(prev => prev.map(u => 
          u.id === referrerId 
            ? { 
                ...u, 
                balance: (parseFloat(u.balance || '0') + referralBonusAmount).toString(),
                monthly_referral_count: (u.monthly_referral_count || 0) + 1
              } 
            : u
        ))
      }

      // Update member balance if cashback applied
      if (cashbackAmount > 0) {
        setUsers(prev => prev.map(u => 
          u.id === userId 
            ? { ...u, balance: (parseFloat(u.balance || '0') + cashbackAmount).toString() } 
            : u
        ))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark user as paid')
    }
  }, [selectedUser])

  const handleDeactivateUser = useCallback(async (userId: string) => {
    try {
      const { error } = await adminUpdateUserStatus(userId, 'inactive')
      if (error) {
        setError(error.message)
      } else {
        // Update local state
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'inactive' } : u))
        if (selectedUser?.id === userId) {
          setSelectedUser({ ...selectedUser, status: 'inactive' })
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate user')
    }
  }, [selectedUser])

  const handleDeactivateWithPayment = useCallback(async (userId: string) => {
    try {
      const targetUser = users.find(u => u.id === userId)
      const newExpirationDate = calculateExtendedExpiration(targetUser?.subscription_expires_at || null)
      
      // Format as YYYY-MM-DD for DATE field in database
      const formattedExpirationDate = newExpirationDate.toISOString().split('T')[0]
      
      const { error } = await adminUpdateUserStatusAndExpiration(
        userId, 
        'active', 
        formattedExpirationDate
      )
      if (error) {
        setError(error.message)
      } else {
        // Update local state with ISO string for consistency
        setUsers(prev => prev.map(u => 
          u.id === userId 
            ? { ...u, status: 'active', subscription_expires_at: newExpirationDate.toISOString() }
            : u
        ))
        if (selectedUser?.id === userId) {
          setSelectedUser({ 
            ...selectedUser, 
            status: 'active', 
            subscription_expires_at: newExpirationDate.toISOString() 
          })
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process payment and activate user')
    }
  }, [selectedUser, users])

  const handleChangeStatus = useCallback(async (userId: string, newStatus: 'unpaid' | 'paid' | 'active' | 'inactive' | 'suspend' | 'ban') => {
    try {
      const { error } = await adminUpdateUserStatus(userId, newStatus)
      if (error) {
        setError(error.message)
      } else {
        // Update local state
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u))
        if (selectedUser?.id === userId) {
          setSelectedUser({ ...selectedUser, status: newStatus })
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user status')
    }
  }, [selectedUser])

  const handleUpdateTier = useCallback(async (userId: string, newTier: 'Rookie' | 'Pro' | 'Legend') => {
    try {
      const { error } = await adminUpdateUserTier(userId, newTier)
      if (error) {
        setError(error.message)
      } else {
        // Update local state
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, tier: newTier } : u))
        if (selectedUser?.id === userId) {
          setSelectedUser({ ...selectedUser, tier: newTier })
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user tier')
    }
  }, [selectedUser])

  const handleUpdateUserRole = useCallback(async (userId: string, role: 'member' | 'admin') => {
    try {
      const { error } = await adminUpdateUserRole(userId, role)
      if (error) {
        setError(error.message)
      } else {
        // Update local state
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
        if (selectedUser?.id === userId) {
          setSelectedUser({ ...selectedUser, role })
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user role')
    }
  }, [selectedUser])

  const getComprehensiveActionButtons = useCallback((user: User) => {
    const buttons = []
    
    // Always add View button
    buttons.push(
      <button
        key="view"
        onClick={() => {
          setSelectedUser(user)
          setShowDetailModal(true)
        }}
        className="action-button action-button-view"
        title="View Details"
      >
        <Eye className="action-icon" />
      </button>
    )
    
    // Status-specific buttons
    switch (user.status) {
      case 'unpaid':
        buttons.push(
          <button
            key="mark-paid"
            onClick={() => {
              if (window.confirm(`Are you sure you want to mark ${user.fullname} as paid?`)) {
                handleMarkPaidUser(user.id)
              }
            }}
            className="action-button action-button-paid"
            title="Mark as Paid"
          >
            <DollarSign className="action-icon" />
          </button>,
          <button
            key="payment"
            onClick={() => {
              if (window.confirm(`Are you sure you want to process payment and activate ${user.fullname} for 30 days?`)) {
                handleDeactivateWithPayment(user.id)
              }
            }}
            className="action-button action-button-payment"
            title="Activate with Payment (30 days)"
          >
            <CreditCard className="action-icon" />
          </button>,
          <button
            key="activate"
            onClick={() => {
              if (window.confirm(`Are you sure you want to activate ${user.fullname}?`)) {
                handleActivateUser(user.id)
              }
            }}
            className="action-button action-button-success"
            title="Activate User"
          >
            <Award className="action-icon" />
          </button>
        )
        break
        
      case 'paid':
        buttons.push(
          <button
            key="activate"
            onClick={() => {
              if (window.confirm(`Are you sure you want to activate ${user.fullname}?`)) {
                handleActivateUser(user.id)
              }
            }}
            className="action-button action-button-success"
            title="Activate User"
          >
            <Award className="action-icon" />
          </button>,
          <button
            key="payment"
            onClick={() => {
              if (window.confirm(`Are you sure you want to extend ${user.fullname} subscription for 30 days?`)) {
                handleDeactivateWithPayment(user.id)
              }
            }}
            className="action-button action-button-payment"
            title="Extend Subscription (30 days)"
          >
            <CreditCard className="action-icon" />
          </button>,
          <button
            key="deactivate"
            onClick={() => {
              if (window.confirm(`Are you sure you want to deactivate ${user.fullname}?`)) {
                handleDeactivateUser(user.id)
              }
            }}
            className="action-button action-button-deactivate"
            title="Deactivate User"
          >
            <Pause className="action-icon" />
          </button>
        )
        break
        
      case 'active':
        buttons.push(
          <button
            key="deactivate"
            onClick={() => {
              if (window.confirm(`Are you sure you want to deactivate ${user.fullname}?`)) {
                handleDeactivateUser(user.id)
              }
            }}
            className="action-button action-button-deactivate"
            title="Deactivate User"
          >
            <Pause className="action-icon" />
          </button>
        )
        break
        
      case 'inactive':
        buttons.push(
          <button
            key="activate"
            onClick={() => {
              if (window.confirm(`Are you sure you want to activate ${user.fullname}?`)) {
                handleActivateUser(user.id)
              }
            }}
            className="action-button action-button-success"
            title="Activate User"
          >
            <Award className="action-icon" />
          </button>,
          <button
            key="payment"
            onClick={() => {
              if (window.confirm(`Are you sure you want to process payment and activate ${user.fullname} for 30 days?`)) {
                handleDeactivateWithPayment(user.id)
              }
            }}
            className="action-button action-button-paid"
            title="Activate with Payment (30 days)"
          >
            <DollarSign className="action-icon" />
          </button>
        )
        break
        
      case 'suspend':
        buttons.push(
          <button
            key="unsuspend"
            onClick={() => {
              if (window.confirm(`Are you sure you want to unsuspend ${user.fullname}?`)) {
                handleUnsuspendUser(user.id)
              }
            }}
            className="action-button action-button-unsuspend"
            title="Unsuspend User"
          >
            <Award className="action-icon" />
          </button>
        )
        break
        
      case 'ban':
        buttons.push(
          <button
            key="unban"
            onClick={() => {
              if (window.confirm(`Are you sure you want to unban ${user.fullname}?`)) {
                handleUnbanUser(user.id)
              }
            }}
            className="action-button action-button-success"
            title="Unban User"
          >
            <Award className="action-icon" />
          </button>
        )
        break
    }
    
    // Add Suspend button for all statuses except suspend and ban
    if (user.status !== 'suspend' && user.status !== 'ban') {
      buttons.push(
        <button
          key="suspend"
          onClick={() => {
            if (window.confirm(`Are you sure you want to suspend ${user.fullname}?`)) {
              handleSuspendUser(user.id)
            }
          }}
          className="action-button action-button-suspend"
          title="Suspend User"
        >
          <Pause className="action-icon" />
        </button>
      )
    }
    
    // Add Ban button for all statuses except ban
    if (user.status !== 'ban') {
      buttons.push(
        <button
          key="ban"
          onClick={() => {
            if (window.confirm(`Are you sure you want to ban ${user.fullname}? This action cannot be undone.`)) {
              handleBanUser(user.id)
            }
          }}
          className="action-button action-button-ban"
          title="Ban User"
        >
          <Ban className="action-icon" />
        </button>
      )
    }
    
    return buttons
  }, [
    handleActivateUser,
    handleBanUser,
    handleDeactivateUser,
    handleDeactivateWithPayment,
    handleMarkPaidUser,
    handleSuspendUser,
    handleUnbanUser,
    handleUnsuspendUser
  ])

  const filteredUsers = users

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const startIndex = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const endIndex = Math.min(totalCount, page * pageSize)

  const userRows = useMemo(() => (
    filteredUsers.map((user) => {
      const subscription = getSubscriptionStatus(user.subscription_expires_at)
      return (
        <tr key={user.id} className="table-row">
          <td className="table-cell-primary">{user.fullname}</td>
          <td className="table-cell">{user.email}</td>
          <td className="table-cell">{user.whatsapp}</td>
          <td className="table-cell">
            <span className={getTierColor(user.tier)}>
              {user.tier}
            </span>
          </td>
          <td className="table-cell">
            <span className={getStatusColor(user.status)}>
              {user.status}
            </span>
          </td>
          <td className="px-6 py-4">
            <div className="flex items-center gap-2">
              <span>{subscription.icon}</span>
              <span className={subscription.color}>
                {subscription.label}
              </span>
            </div>
          </td>
          <td className="table-cell">
            <span className={`futuristic-badge ${user.role === 'admin' ? 'futuristic-badge-warning' : 'futuristic-badge-secondary'}`}>
              {user.role}
            </span>
          </td>
          <td className="table-cell">
            {new Date(user.created_at).toLocaleDateString()}
          </td>
          <td className="table-cell">
            <div className="comprehensive-action-buttons">
              {getComprehensiveActionButtons(user)}
            </div>
          </td>
        </tr>
      )
    })
  ), [filteredUsers, getComprehensiveActionButtons])

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner-large"></div>
        <p>Loading users...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <div className="error-message">
          <X className="error-icon" />
          Error: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-actions">
        <div className="search-input-wrapper">
          <Search className="search-input-icon" />
          <input
            type="text"
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-dropdowns">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-dropdown"
          >
            <option value="all">All Status</option>
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspend">Suspend</option>
            <option value="ban">Banned</option>
          </select>
          
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="filter-dropdown"
          >
            <option value="all">All Tiers</option>
            <option value="Rookie">Rookie</option>
            <option value="Pro">Pro</option>
            <option value="Legend">Legend</option>
          </select>
          
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="filter-dropdown"
          >
            <option value="all">All Roles</option>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button className="filter-button">
          <Filter className="filter-icon" />
          Filter
        </button>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>WhatsApp</th>
              <th>Tier</th>
              <th>Status</th>
              <th>Expires</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={9} className="table-cell text-center text-gray-400 py-12">
                  No members found.
                </td>
              </tr>
            ) : (
              userRows
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

      {/* User Detail Modal */}
      {showDetailModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content modal-large">
            <div className="modal-header">
              <h2 className="modal-title">User Details</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="modal-close"
              >
                <X className="modal-close-icon" />
              </button>
            </div>

            <div className="modal-body">
              <div className="user-details-grid">
                {/* Basic Information */}
                <div className="detail-section">
                  <h3 className="detail-section-title">
                    <UserIcon className="section-icon" />
                    Basic Information
                  </h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label className="detail-label">User ID</label>
                      <p className="detail-value detail-value-mono">{selectedUser.id}</p>
                    </div>
                    <div className="detail-item">
                      <label className="detail-label">Full Name</label>
                      <p className="detail-value">{selectedUser.fullname}</p>
                    </div>
                    <div className="detail-item">
                      <label className="detail-label">Email</label>
                      <p className="detail-value">{selectedUser.email}</p>
                    </div>
                    <div className="detail-item">
                      <label className="detail-label">WhatsApp</label>
                      <p className="detail-value">{selectedUser.whatsapp || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                {/* Account Status */}
                <div className="detail-section">
                  <h3 className="detail-section-title">
                    <Award className="section-icon" />
                    Account Status
                  </h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label className="detail-label">Role</label>
                      <span className={`futuristic-badge ${selectedUser.role === 'admin' ? 'futuristic-badge-warning' : 'futuristic-badge-secondary'}`}>
                        {selectedUser.role}
                      </span>
                    </div>
                    <div className="detail-item">
                      <label className="detail-label">Status</label>
                      <div className="status-change-container">
                        <span className={getStatusColor(selectedUser.status)}>
                          {selectedUser.status}
                        </span>
                        <select
                          value={selectedUser.status}
                          onChange={(e) => {
                            const newStatus = e.target.value as 'unpaid' | 'paid' | 'active' | 'inactive' | 'suspend' | 'ban'
                            if (window.confirm(`Are you sure you want to change status from "${selectedUser.status}" to "${newStatus}"?`)) {
                              handleChangeStatus(selectedUser.id, newStatus)
                            }
                          }}
                          className="status-dropdown"
                        >
                          <option value="unpaid">Unpaid</option>
                          <option value="paid">Paid</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="suspend">Suspend</option>
                          <option value="ban">Ban</option>
                        </select>
                      </div>
                    </div>
                    <div className="detail-item">
                      <label className="detail-label">Tier</label>
                      <div className="status-change-container">
                        <span className={getTierColor(selectedUser.tier)}>
                          {selectedUser.tier}
                        </span>
                        <select
                          value={selectedUser.tier}
                          onChange={(e) => {
                            const newTier = e.target.value as 'Rookie' | 'Pro' | 'Legend'
                            if (window.confirm(`Are you sure you want to change tier from "${selectedUser.tier}" to "${newTier}"?`)) {
                              handleUpdateTier(selectedUser.id, newTier)
                            }
                          }}
                          className="status-dropdown"
                        >
                          <option value="Rookie">Rookie</option>
                          <option value="Pro">Pro</option>
                          <option value="Legend">Legend</option>
                        </select>
                      </div>
                    </div>
                    <div className="detail-item">
                      <label className="detail-label">Tier</label>
                      <p className="detail-value">
                        {selectedUser.tier}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Membership Information */}
                <div className="detail-section">
                  <h3 className="detail-section-title">
                    <Calendar className="section-icon" />
                    Membership Information
                  </h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label className="detail-label">Member Since</label>
                      <p className="detail-value">
                        {selectedUser.membership_start
                          ? new Date(selectedUser.membership_start).toLocaleDateString()
                          : 'Not started'
                        }
                      </p>
                    </div>
                    <div className="detail-item">
                      <label className="detail-label">Subscription Expires</label>
                      <div className="flex items-center gap-2">
                        <span>{getSubscriptionStatus(selectedUser.subscription_expires_at).icon}</span>
                        <span className={getSubscriptionStatus(selectedUser.subscription_expires_at).color}>
                          {getSubscriptionStatus(selectedUser.subscription_expires_at).label}
                        </span>
                      </div>
                    </div>
                    <div className="detail-item">
                      <label className="detail-label">Joined Date</label>
                      <p className="detail-value">
                        {new Date(selectedUser.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="detail-item">
                      <label className="detail-label">Account Age</label>
                      <p className="detail-value">
                        {Math.floor(
                          (Date.now() - new Date(selectedUser.created_at).getTime()) / 
                          (1000 * 60 * 60 * 24)
                        )} days
                      </p>
                    </div>
                  </div>
                </div>

                {/* Financial Information */}
                <div className="detail-section">
                  <h3 className="detail-section-title">
                    <DollarSign className="section-icon" />
                    Financial Information
                  </h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label className="detail-label">Wallet Balance</label>
                      <p className="detail-value detail-value-currency">
                        Rp {parseFloat(selectedUser.balance).toLocaleString('id-ID')}
                      </p>
                    </div>
                    <div className="detail-item">
                      <label className="detail-label">Monthly Referral Count</label>
                      <p className="detail-value detail-value-number">
                        {selectedUser.monthly_referral_count || 0} referrals
                      </p>
                    </div>
                  </div>
                </div>

                {/* Referral Information */}
                <div className="detail-section">
                  <h3 className="detail-section-title">
                    <Target className="section-icon" />
                    Referral Information
                  </h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label className="detail-label">Referral Code</label>
                      <p className="detail-value detail-value-mono">{selectedUser.referral_code}</p>
                    </div>
                    <div className="detail-item">
                      <label className="detail-label">Referred By</label>
                      <p className="detail-value">
                        {selectedUser.referred_by || 'Direct registration'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <div className="modal-actions-group">
                <div className="modal-actions-left">
                  <button
                    onClick={() => handleUpdateUserRole(selectedUser.id, selectedUser.role === 'admin' ? 'member' : 'admin')}
                    className="modal-button modal-button-primary"
                  >
                    <Award className="button-icon" />
                    Change Role to {selectedUser.role === 'admin' ? 'Member' : 'Admin'}
                  </button>
                  <button
                    onClick={() => {
                      // Copy referral code to clipboard
                      navigator.clipboard.writeText(selectedUser.referral_code)
                      alert('Referral code copied to clipboard!')
                    }}
                    className="modal-button modal-button-secondary"
                  >
                    <Gift className="button-icon" />
                    Copy Referral Code
                  </button>
                </div>
                <div className="modal-actions-right">
                  {/* Show Activate/Unsuspend button based on status */}
                  {(selectedUser.status === 'inactive' || selectedUser.status === 'unpaid' || selectedUser.status === 'paid') && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to activate ${selectedUser.fullname}?`)) {
                          handleActivateUser(selectedUser.id)
                        }
                      }}
                      className="modal-button modal-button-success"
                    >
                      <Award className="button-icon" />
                      Activate
                    </button>
                  )}
                  
                  {/* Show Payment button for users who can extend subscription */}
                  {(selectedUser.status === 'inactive' || selectedUser.status === 'unpaid' || selectedUser.status === 'paid') && (
                    <button
                      onClick={() => {
                        const action = selectedUser.status === 'paid' 
                          ? `extend ${selectedUser.fullname} subscription for 30 days`
                          : `process payment and activate ${selectedUser.fullname} for 30 days`
                        if (window.confirm(`Are you sure you want to ${action}?`)) {
                          handleDeactivateWithPayment(selectedUser.id)
                        }
                      }}
                      className="modal-button modal-button-payment"
                    >
                      <CreditCard className="button-icon" />
                      {selectedUser.status === 'paid' ? 'Extend Subscription' : 'Activate with Payment'}
                    </button>
                  )}
                  
                  {selectedUser.status === 'suspend' && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to unsuspend ${selectedUser.fullname}?`)) {
                          handleUnsuspendUser(selectedUser.id)
                        }
                      }}
                      className="modal-button modal-button-info"
                    >
                      <Award className="button-icon" />
                      Unsuspend
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to suspend ${selectedUser.fullname}?`)) {
                        handleSuspendUser(selectedUser.id)
                      }
                    }}
                    className="modal-button modal-button-warning"
                    disabled={selectedUser.status === 'suspend'}
                  >
                    <Pause className="button-icon" />
                    {selectedUser.status === 'suspend' ? 'Already Suspended' : 'Suspend'}
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to ban ${selectedUser.fullname}? This action cannot be undone.`)) {
                        handleBanUser(selectedUser.id)
                      }
                    }}
                    className="modal-button modal-button-danger"
                    disabled={selectedUser.status === 'ban'}
                  >
                    <Ban className="button-icon" />
                    {selectedUser.status === 'ban' ? 'Already Banned' : 'Ban'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
