'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import ProtectedRoute from '../components/ProtectedRoute'

export default function AdminDashboard() {
  return (
    <ProtectedRoute>
      <div className="dashboard-grid">
      <div className="dashboard-card quick-actions-card">
        <div className="card-header">
          <h3 className="card-title">Quick Actions</h3>
          <div className="card-icon">
            <Plus size={20} />
          </div>
        </div>
        <div className="card-content">
          <div className="quick-actions-grid">
            <Link href="/admin/dashboard/registration" className="futuristic-btn futuristic-btn-sm">User Registration</Link>
            <Link href="/admin/dashboard/extended-members" className="futuristic-btn futuristic-btn-secondary futuristic-btn-sm">Extended Member</Link>
            <Link href="/admin/dashboard/members" className="futuristic-btn futuristic-btn-secondary futuristic-btn-sm">Member Geuwat</Link>
            <Link href="/admin/dashboard/withdrawal" className="futuristic-btn futuristic-btn-secondary futuristic-btn-sm">Withdrawal</Link>
            <Link href="/admin/dashboard/referral-tiers" className="futuristic-btn futuristic-btn-secondary futuristic-btn-sm">Referral Tiers</Link>
            <Link href="/admin/dashboard/member-analytics" className="futuristic-btn futuristic-btn-secondary futuristic-btn-sm">Member Analytics</Link>
            <Link href="/admin/dashboard/financial-analytics" className="futuristic-btn futuristic-btn-secondary futuristic-btn-sm">Financial Analytics</Link>
            <Link href="/admin/dashboard/broadcasting" className="futuristic-btn futuristic-btn-secondary futuristic-btn-sm">Broadcasting</Link>
            <Link href="/admin/dashboard/history" className="futuristic-btn futuristic-btn-secondary futuristic-btn-sm">History</Link>
            <Link href="/admin/dashboard/settings" className="futuristic-btn futuristic-btn-sm">Settings</Link>
          </div>
        </div>
      </div>
      </div>
    </ProtectedRoute>
  )
}
