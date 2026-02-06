'use client'

import React, { useState, useEffect } from 'react'
import { Users, Search, Filter, Download, Eye, UserCheck, CalendarCheck, Repeat } from 'lucide-react'
import { adminGetUsers } from '@/lib/adminSupabase'
import { getExtensionRequests } from '@/lib/supabase'
import type { ExtensionRequest, User } from '@/types/database'

export default function MemberAnalyticsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [extensions, setExtensions] = useState<ExtensionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const [usersRes, extensionsRes] = await Promise.all([
        adminGetUsers(),
        getExtensionRequests()
      ])

      if (usersRes.error) {
        setError(usersRes.error.message)
      } else {
        setUsers(usersRes.users || [])
      }

      if (extensionsRes.error) {
        setError(extensionsRes.error.message)
      } else {
        setExtensions(extensionsRes.extensions || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  // Calculate metrics from real data
  const calculateMetrics = () => {
    const totalMembers = users.length
    const activeMembers = users.filter(u => u.status === 'active').length
    const suspendedMembers = users.filter(u => u.status === 'suspend').length
    const bannedMembers = users.filter(u => u.status === 'ban').length
    const inactiveMembers = users.filter(u => u.status === 'inactive').length
    const unpaidMembers = users.filter(u => u.status === 'unpaid').length
    const paidMembers = users.filter(u => u.status === 'paid').length
    
    const tierDistribution = {
      Rookie: users.filter(u => u.tier === 'Rookie').length,
      Pro: users.filter(u => u.tier === 'Pro').length,
      Legend: users.filter(u => u.tier === 'Legend').length
    }

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    const newMembersThisMonth = users.filter(u => {
      if (!u.membership_start) return false
      const d = new Date(u.membership_start)
      return d >= monthStart && d < nextMonth
    }).length

    const approvedExtensionsThisMonth = extensions.filter(e => {
      if (e.status !== 'approved') return false
      const d = new Date(e.updated_at)
      return d >= monthStart && d < nextMonth
    }).length

    return {
      totalMembers,
      activeMembers,
      suspendedMembers,
      bannedMembers,
      inactiveMembers,
      unpaidMembers,
      paidMembers,
      tierDistribution,
      newMembersThisMonth,
      approvedExtensionsThisMonth
    }
  }

  const metrics = calculateMetrics()

  const memberAnalytics = [
    { 
      title: 'Total Members', 
      value: metrics.totalMembers.toString(), 
      icon: Users, 
      color: 'from-cyan-500 to-blue-600', 
      description: 'All registered members' 
    },
    { 
      title: 'Active Members', 
      value: metrics.activeMembers.toString(), 
      icon: UserCheck, 
      color: 'from-green-500 to-emerald-600', 
      description: 'Currently active members' 
    },
    { 
      title: 'New Members (Monthly)', 
      value: metrics.newMembersThisMonth.toString(), 
      icon: CalendarCheck, 
      color: 'from-blue-500 to-cyan-600', 
      description: 'Joined this month' 
    },
    { 
      title: 'Approved Extensions (Monthly)', 
      value: metrics.approvedExtensionsThisMonth.toString(), 
      icon: Repeat, 
      color: 'from-purple-500 to-pink-600', 
      description: 'Approved extensions this month' 
    },
    { 
      title: 'Paid Members', 
      value: metrics.paidMembers.toString(), 
      icon: UserCheck, 
      color: 'from-blue-500 to-indigo-600', 
      description: 'Members with paid status' 
    },
    { 
      title: 'Unpaid Members', 
      value: metrics.unpaidMembers.toString(), 
      icon: Users, 
      color: 'from-yellow-500 to-orange-600', 
      description: 'Members awaiting payment' 
    },
    { 
      title: 'Suspended Members', 
      value: metrics.suspendedMembers.toString(), 
      icon: Users, 
      color: 'from-orange-500 to-red-600', 
      description: 'Currently suspended accounts' 
    },
    { 
      title: 'Banned Members', 
      value: metrics.bannedMembers.toString(), 
      icon: Users, 
      color: 'from-red-500 to-red-700', 
      description: 'Permanently banned accounts' 
    },
    { 
      title: 'Inactive Members', 
      value: metrics.inactiveMembers.toString(), 
      icon: Users, 
      color: 'from-gray-500 to-gray-700', 
      description: 'Currently inactive accounts' 
    }
  ]

  const tierDistribution = [
    { 
      tier: 'Rookie', 
      count: metrics.tierDistribution.Rookie, 
      percentage: metrics.totalMembers > 0 ? (metrics.tierDistribution.Rookie / metrics.totalMembers * 100).toFixed(1) : '0', 
      color: 'from-green-500 to-emerald-600' 
    },
    { 
      tier: 'Pro', 
      count: metrics.tierDistribution.Pro, 
      percentage: metrics.totalMembers > 0 ? (metrics.tierDistribution.Pro / metrics.totalMembers * 100).toFixed(1) : '0', 
      color: 'from-blue-500 to-cyan-600' 
    },
    { 
      tier: 'Legend', 
      count: metrics.tierDistribution.Legend, 
      percentage: metrics.totalMembers > 0 ? (metrics.tierDistribution.Legend / metrics.totalMembers * 100).toFixed(1) : '0', 
      color: 'from-purple-500 to-pink-600' 
    }
  ]

  // Sort users by monthly referral count and created date
  const memberActivityData = users
    .sort((a, b) => (b.monthly_referral_count || 0) - (a.monthly_referral_count || 0))
    .slice(0, 12)
    .map(user => ({
      id: user.id,
      name: user.fullname,
      email: user.email,
      tier: user.tier,
      lastActive: user.created_at 
        ? `${Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24))} days ago`
        : 'Unknown',
      referralCount: user.monthly_referral_count || 0,
      status: user.status,
      balance: parseFloat(user.balance || '0').toLocaleString('id-ID')
    }))

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Legend': return 'tier-legend'
      case 'Pro': return 'tier-pro'
      case 'Rookie': return 'tier-rookie'
      default: return 'tier-rookie'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'status-active'
      case 'paid': return 'status-paid'
      case 'unpaid': return 'status-unpaid'
      case 'inactive': return 'status-inactive'
      case 'suspend': return 'status-suspend'
      case 'ban': return 'status-ban'
      default: return 'status-inactive'
    }
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-content">
          <div className="loading-spinner-large"></div>
          <p>Loading member analytics...</p>
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
    <div className="dashboard-container member-analytics">
      {/* Metrics Cards */}
      <div className="analytics-grid">
        {memberAnalytics.map((metric, index) => {
          const IconComponent = metric.icon
          return (
            <div key={index} className="analytics-card">
              <div className="card-header">
                <div className={`analytics-icon ${metric.color}`}>
                  <IconComponent className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="analytics-value">{metric.value}</h3>
              <p className="analytics-title">{metric.title}</p>
              <p className="analytics-description">{metric.description}</p>
            </div>
          )
        })}
      </div>

      {/* Tier Distribution */}
      <div className="analytics-section">
        <div className="analytics-row">
          <div className="dashboard-card">
            <h2 className="analytics-section-title">Tier Distribution</h2>
            <div className="tier-list">
              {tierDistribution.map((tier) => (
                <div key={tier.tier} className="tier-item">
                  <div className="tier-info">
                    <span className={`tier-badge ${getTierColor(tier.tier)}`}>
                      {tier.tier}
                    </span>
                    <span className="tier-count">{tier.count} members</span>
                  </div>
                  <div className="tier-progress">
                    <div className="tier-progress-bar">
                      <div 
                        className={`tier-progress-fill ${tier.color}`}
                        style={{ width: `${tier.percentage}%` }}
                      />
                    </div>
                    <span className="tier-percentage">{tier.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Member Activity Table */}
      <div className="dashboard-card">
        <div className="card-header">
          <h2 className="analytics-section-title">Top Members by Referrals</h2>
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input pl-10"
              />
            </div>
            <button className="btn btn-secondary btn-sm">
              <Filter className="w-4 h-4" />
              Filter
            </button>
            <button className="btn btn-secondary btn-sm">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Tier</th>
                <th>Status</th>
                <th>Referrals</th>
                <th>Balance</th>
                <th>Member Since</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {memberActivityData
                .filter(member => 
                  member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  member.email.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((member) => (
                <tr key={member.id}>
                  <td className="font-semibold">{member.name}</td>
                  <td>{member.email}</td>
                  <td>
                    <span className={`tier-badge ${getTierColor(member.tier)}`}>
                      {member.tier}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusColor(member.status)}`}>
                      {member.status}
                    </span>
                  </td>
                  <td>{member.referralCount}</td>
                  <td>Rp {member.balance}</td>
                  <td>{member.lastActive}</td>
                  <td>
                    <button className="btn btn-icon btn-outline">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
