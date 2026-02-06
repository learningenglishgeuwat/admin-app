'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, Search, Filter, Download, Eye, CheckCircle, Clock, X, Users, MessageSquare, Send } from 'lucide-react'
import { getNotifications, updateNotification, getUsers, createNotification } from '@/lib/supabase'
import type { Notification, User } from '@/types/database'

const getStatusColor = (status: string) => {
  switch (status) {
    case 'read':
      return 'status-badge status-inactive'
    case 'unread':
      return 'status-badge status-completed'
    default:
      return 'status-badge status-inactive'
  }
}

const getTypeColor = (type: string) => {
  switch (type) {
    case 'info':
      return 'status-badge status-paid'
    case 'success':
      return 'status-badge status-completed'
    case 'warning':
      return 'status-badge status-pending'
    case 'error':
      return 'status-badge status-failed'
    default:
      return 'status-badge status-inactive'
  }
}

export default function BroadcastingPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [activeSection, setActiveSection] = useState('notifications')

  // Compose message states
  const [messageTitle, setMessageTitle] = useState('')
  const [messageContent, setMessageContent] = useState('')
  const [messageType, setMessageType] = useState<'info' | 'success' | 'warning' | 'error'>('info')
  const [targetType, setTargetType] = useState<'all' | 'tier' | 'specific'>('all')
  const [selectedTier, setSelectedTier] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [sending, setSending] = useState(false)

  // Data states
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const options: {
        status?: string
        type?: string
        limit?: number
        offset?: number
        search?: string
      } = {}
      
      if (statusFilter !== 'all') {
        options.status = statusFilter
      }
      
      if (typeFilter !== 'all') {
        options.type = typeFilter
      }
      
      options.search = searchQuery.trim() || undefined
      options.limit = pageSize
      options.offset = (page - 1) * pageSize

      const { notifications, count, error } = await getNotifications(undefined, options)
      
      if (error) {
        setError(error.message)
      } else {
        setNotifications(notifications || [])
        setTotalCount(count ?? 0)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, typeFilter, searchQuery, page, pageSize])

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
    fetchNotifications()
    fetchUsers()
  }, [fetchNotifications, fetchUsers])

  useEffect(() => {
    setPage(1)
  }, [searchQuery, statusFilter, typeFilter, pageSize])

  const getFilteredNotifications = () => notifications

  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await updateNotification(notificationId, { read_at: new Date().toISOString() })
      
      if (error) {
        setError(error.message)
      } else {
        // Refresh notifications
        fetchNotifications()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as read')
    }
  }, [fetchNotifications])

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read_at)
      
      for (const notification of unreadNotifications) {
        await updateNotification(notification.id, { read_at: new Date().toISOString() })
      }
      
      // Refresh notifications
      fetchNotifications()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark all as read')
    }
  }, [fetchNotifications, notifications])

  const handleSendMessage = async () => {
    if (!messageTitle.trim() || !messageContent.trim()) {
      setError('Please fill in both title and content')
      return
    }

    try {
      setSending(true)
      setError(null)

      let recipients: string[] = []

      if (targetType === 'all') {
        // Send to all users
        recipients = users.map(u => u.id)
      } else if (targetType === 'tier') {
        // Send to users with specific tier
        recipients = users.filter(u => u.tier === selectedTier).map(u => u.id)
      } else if (targetType === 'specific') {
        // Send to selected members
        recipients = selectedMembers
      }

      // Create notification for each recipient
      const notificationPromises = recipients.map(recipientId =>
        createNotification({
          recipient_id: recipientId,
          type: messageType,
          content: messageContent,
          status: 'unread',
          read_at: null
        })
      )

      await Promise.all(notificationPromises)

      // Reset form
      setMessageTitle('')
      setMessageContent('')
      setMessageType('info')
      setTargetType('all')
      setSelectedTier('')
      setSelectedMembers([])

      // Show success message
      setError(`Message sent to ${recipients.length} member(s) successfully!`)

      // Switch to notifications tab to see sent messages
      setActiveSection('notifications')
      fetchNotifications()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const stats = useMemo(() => ({
    total: notifications.length,
    unread: notifications.filter(n => !n.read_at).length,
    read: notifications.filter(n => n.read_at).length,
    byType: {
      info: notifications.filter(n => n.type === 'info').length,
      success: notifications.filter(n => n.type === 'success').length,
      warning: notifications.filter(n => n.type === 'warning').length,
      error: notifications.filter(n => n.type === 'error').length,
      other: notifications.filter(n => !['info', 'success', 'warning', 'error'].includes(n.type || '')).length
    }
  }), [notifications])
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const startIndex = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const endIndex = Math.min(totalCount, page * pageSize)

  const notificationRows = useMemo(() => (
    getFilteredNotifications().map((notification) => (
      <tr key={notification.id} className={!notification.read_at ? 'unread-row' : ''}>
        <td className="table-cell font-mono text-xs">{notification.id}</td>
        <td className="table-cell">
          <span className={getTypeColor(notification.type || 'info')}>
            {notification.type || 'info'}
          </span>
        </td>
        <td className="table-cell max-w-xs">
          <div className="truncate" title={notification.content}>
            {notification.content}
          </div>
        </td>
        <td className="table-cell">
          {notification.recipient_id || 'System'}
        </td>
        <td className="table-cell">
          <span className={getStatusColor(notification.status)}>
            {notification.status}
          </span>
        </td>
        <td className="table-cell">
          {new Date(notification.created_at).toLocaleDateString()}
        </td>
        <td className="table-cell">
          {notification.read_at ? (
            <span className="text-green-500">
              {new Date(notification.read_at).toLocaleDateString()}
            </span>
          ) : (
            <span className="text-yellow-500">Not read</span>
          )}
        </td>
        <td className="table-cell">
          <div className="table-actions">
            {!notification.read_at && (
              <button
                onClick={() => handleMarkAsRead(notification.id)}
                className="btn btn-sm btn-primary"
                title="Mark as read"
              >
                <Eye className="icon-sm" />
              </button>
            )}
          </div>
        </td>
      </tr>
    ))
  ), [notifications, handleMarkAsRead])

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-content">
          <div className="loading-spinner-large"></div>
          <p>Loading notifications...</p>
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
      <div className="header-actions mb-4">
        <button
          onClick={handleMarkAllAsRead}
          className="btn btn-secondary btn-sm"
          disabled={stats.unread === 0}
        >
          <CheckCircle className="icon-sm" />
          Mark All as Read
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="nav-tabs">
        <button
          onClick={() => setActiveSection('notifications')}
          className={`nav-tab ${activeSection === 'notifications' ? 'nav-tab-active' : 'nav-tab-inactive'}`}
        >
          <Bell className="icon-sm mr-2" />
          Notifications
        </button>
        <button
          onClick={() => setActiveSection('compose')}
          className={`nav-tab ${activeSection === 'compose' ? 'nav-tab-active' : 'nav-tab-inactive'}`}
        >
          <MessageSquare className="icon-sm mr-2" />
          Compose Message
        </button>
        <button
          onClick={() => setActiveSection('sent')}
          className={`nav-tab ${activeSection === 'sent' ? 'nav-tab-active' : 'nav-tab-inactive'}`}
        >
          <Send className="icon-sm mr-2" />
          Sent Messages
        </button>
      </div>

      {/* Notifications Section */}
      {activeSection === 'notifications' && (
        <>
          {/* Summary Stats */}
          <div className="analytics-grid">
            <div className="analytics-card">
              <div className="card-header">
                <div className="analytics-icon notification-icon">
                  <Bell className="icon-md text-white" />
                </div>
              </div>
              <h3 className="analytics-value">{stats.total}</h3>
              <p className="analytics-title">Total</p>
              <p className="analytics-description">All notifications</p>
            </div>
            <div className="analytics-card">
              <div className="card-header">
                <div className="analytics-icon unread-icon">
                  <Bell className="icon-md text-white" />
                </div>
              </div>
              <h3 className="analytics-value">{stats.unread}</h3>
              <p className="analytics-title">Unread</p>
              <p className="analytics-description">Pending notifications</p>
            </div>
            <div className="analytics-card">
              <div className="card-header">
                <div className="analytics-icon analytics-icon-success">
                  <Eye className="icon-md text-white" />
                </div>
              </div>
              <h3 className="analytics-value">{stats.read}</h3>
              <p className="analytics-title">Read</p>
              <p className="analytics-description">Viewed notifications</p>
            </div>
            <div className="analytics-card">
              <div className="card-header">
                <div className="analytics-icon analytics-icon-info">
                  <Clock className="icon-md text-white" />
                </div>
              </div>
              <h3 className="analytics-value">{stats.byType.info}</h3>
              <p className="analytics-title">Info</p>
              <p className="analytics-description">Information notifications</p>
            </div>
            <div className="analytics-card">
              <div className="card-header">
                <div className="analytics-icon analytics-icon-error">
                  <X className="icon-md text-white" />
                </div>
              </div>
              <h3 className="analytics-value">{stats.byType.error}</h3>
              <p className="analytics-title">Errors</p>
              <p className="analytics-description">Error notifications</p>
            </div>
          </div>

          {/* Notifications List */}
          <div className="dashboard-card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="analytics-section-title">Notifications List</h2>
              <div className="table-header">
                <div className="relative">
                  <Search className="absolute left-3 top-1\/2 transform-y-negative-50 text-gray-400 icon-sm" />
                  <input
                    type="text"
                    placeholder="Search notifications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="form-input pl-10"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="form-select"
                >
                  <option value="all">All Status</option>
                  <option value="read">Read</option>
                  <option value="unread">Unread</option>
                </select>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="form-select"
                >
                  <option value="all">All Types</option>
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </select>
                <button className="btn btn-secondary btn-sm">
                  <Filter className="icon-sm" />
                  Filter
                </button>
                <button className="btn btn-secondary btn-sm">
                  <Download className="icon-sm" />
                  Export
                </button>
              </div>
            </div>

            {/* Notification Table */}
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Type</th>
                    <th>Content</th>
                    <th>Recipient ID</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Read</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {notifications.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="table-cell text-center text-gray-400 py-12">
                        No notifications found.
                      </td>
                    </tr>
                  ) : (
                    notificationRows
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
        </>
      )}

      {/* Compose Message Section */}
      {activeSection === 'compose' && (
        <div className="dashboard-card">
          <h2 className="analytics-section-title">Compose Message</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-500\/20 border border-red-500 rounded-lg text-red-500">
              {error}
            </div>
          )}

          <div className="form-space">
            <div>
              <label className="form-label">Message Title</label>
              <input
                type="text"
                value={messageTitle}
                onChange={(e) => setMessageTitle(e.target.value)}
                className="form-input"
                placeholder="Enter message title..."
              />
            </div>

            <div>
              <label className="form-label">Message Content</label>
              <textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                rows={6}
                className="form-textarea"
                placeholder="Enter your message content..."
              />
            </div>

            <div>
              <label className="form-label">Message Type</label>
              <select
                value={messageType}
                onChange={(e) => setMessageType(e.target.value as 'info' | 'success' | 'warning' | 'error')}
                className="form-select"
              >
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
            </div>

            <div>
              <label className="form-label">Target Audience</label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value as 'all' | 'tier' | 'specific')}
                className="form-select"
              >
                <option value="all">All Members</option>
                <option value="tier">Specific Tier</option>
                <option value="specific">Specific Members</option>
              </select>
            </div>

            {targetType === 'tier' && (
              <div>
                <label className="form-label">Select Tier</label>
                <select
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(e.target.value)}
                  className="form-select"
                >
                  <option value="">Select a tier</option>
                  <option value="Rookie">Rookie</option>
                  <option value="Pro">Pro</option>
                  <option value="Legend">Legend</option>
                </select>
              </div>
            )}

            {targetType === 'specific' && (
              <div>
                <label className="form-label">Select Members</label>
                <div className="member-selection-list">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center p-2 hover:bg-gray-800">
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMembers([...selectedMembers, user.id])
                          } else {
                            setSelectedMembers(selectedMembers.filter(id => id !== user.id))
                          }
                        }}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-medium">{user.fullname}</div>
                        <div className="text-sm text-gray-400">{user.email}</div>
                        <div className="text-xs text-gray-500">Tier: {user.tier}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleSendMessage}
                disabled={sending || !messageTitle.trim() || !messageContent.trim()}
                className="btn btn-primary"
              >
                {sending ? (
                  <>
                    <div className="icon-sm border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="icon-sm mr-2" />
                    Send Message
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setMessageTitle('')
                  setMessageContent('')
                  setMessageType('info')
                  setTargetType('all')
                  setSelectedTier('')
                  setSelectedMembers([])
                  setError(null)
                }}
                className="btn btn-secondary"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sent Messages Section - Placeholder */}
      {activeSection === 'sent' && (
        <div className="dashboard-card">
          <h2 className="analytics-section-title">Sent Messages</h2>
          <div className="text-center py-12">
            <Send className="icon-xl text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">Sent messages feature coming soon...</p>
          </div>
        </div>
      )}

    </div>
  )
}
