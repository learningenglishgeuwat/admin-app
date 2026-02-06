'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BarChart3,
  DollarSign,
  Gift,
  History,
  LogOut,
  Megaphone,
  Menu,
  Minimize,
  Plus,
  Settings,
  Users,
  Wallet
} from 'lucide-react'
import { AdminAuthProvider, useAdminAuth } from './contexts/AdminAuthContext'
import RefreshButton from './components/RefreshButton'

// Import CSS untuk semua halaman admin
import './styles/tokens.css'
import './styles/components.css'
import './styles/dashboard.css'
import './styles/login.css'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  exact?: boolean
}

const navItems: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: BarChart3, exact: true },
  { href: '/admin/dashboard/members', label: 'Members', icon: Users },
  { href: '/admin/dashboard/extended-members', label: 'Extended Members', icon: Minimize },
  { href: '/admin/dashboard/member-analytics', label: 'Member Analytics', icon: BarChart3 },
  { href: '/admin/dashboard/financial-analytics', label: 'Financial Analytics', icon: DollarSign },
  { href: '/admin/dashboard/broadcasting', label: 'Broadcasting', icon: Megaphone },
  { href: '/admin/dashboard/history', label: 'History', icon: History },
  { href: '/admin/dashboard/referral-tiers', label: 'Referral Tiers', icon: BarChart3 },
  { href: '/admin/dashboard/custom-reward', label: 'Custom Reward', icon: Gift },
  { href: '/admin/dashboard/registration', label: 'Registration', icon: Plus },
  { href: '/admin/dashboard/withdrawal', label: 'Withdrawal', icon: Wallet },
  { href: '/admin/dashboard/settings', label: 'Settings', icon: Settings }
]

const pageTitleMap: Array<{ path: string; title: string; exact?: boolean }> = [
  { path: '/admin/dashboard', title: 'Dashboard', exact: true },
  { path: '/admin/dashboard/members', title: 'Members' },
  { path: '/admin/dashboard/extended-members', title: 'Extended Members' },
  { path: '/admin/dashboard/member-analytics', title: 'Member Analytics' },
  { path: '/admin/dashboard/financial-analytics', title: 'Financial Analytics' },
  { path: '/admin/dashboard/broadcasting', title: 'Broadcasting' },
  { path: '/admin/dashboard/history', title: 'History' },
  { path: '/admin/dashboard/referral-tiers', title: 'Referral Tiers' },
  { path: '/admin/dashboard/custom-reward', title: 'Custom Reward' },
  { path: '/admin/dashboard/registration', title: 'Registration' },
  { path: '/admin/dashboard/withdrawal', title: 'Withdrawal' },
  { path: '/admin/dashboard/settings', title: 'Settings' }
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Don't apply layout to login, register, forgot-password, reset-password, and registrationForm pages
  if (
    pathname === '/admin/login' ||
    pathname === '/admin/dashboard/register' ||
    pathname === '/admin/registrationForm' ||
    pathname?.startsWith('/admin/forgot-password') ||
    pathname?.startsWith('/admin/reset-password')
  ) {
    return <AdminAuthProvider>{children}</AdminAuthProvider>
  }

  return (
    <AdminAuthProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminAuthProvider>
  )
}

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const { user, loading, signOut, refreshAuth } = useAdminAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const pageTitle = useMemo(() => {
    const match = pageTitleMap.find((item) => {
      if (item.exact) return pathname === item.path
      return pathname.startsWith(item.path)
    })
    return match?.title ?? 'Admin'
  }, [pathname])

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== 'admin') {
        router.replace('/admin/login')
      }
    }
  }, [loading, user, router])

  useEffect(() => {
    if (!pathname) return

    const storageKey = 'admin-table-scroll-hint-hidden'
    const selector = '.data-table-container, .table-responsive'
    const containers = Array.from(document.querySelectorAll<HTMLElement>(selector))
    if (containers.length === 0) return

    const hideClass = 'scroll-hint-hidden'
    const persistHidden = localStorage.getItem(storageKey) === '1'
    if (persistHidden) {
      containers.forEach((el) => el.classList.add(hideClass))
      return
    }

    const handleScroll = (el: HTMLElement) => {
      if (el.scrollLeft > 8) {
        el.classList.add(hideClass)
        localStorage.setItem(storageKey, '1')
      }
    }

    const listeners: Array<{ el: HTMLElement; fn: () => void }> = []
    containers.forEach((el) => {
      const fn = () => handleScroll(el)
      el.addEventListener('scroll', fn, { passive: true })
      listeners.push({ el, fn })
    })

    return () => {
      listeners.forEach(({ el, fn }) => el.removeEventListener('scroll', fn))
    }
  }, [pathname])

  const handleLogout = async () => {
    await signOut()
    router.replace('/admin/login')
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner" />
          <div>Checking authentication...</div>
        </div>
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-background" />
      <div className="dashboard-orb dashboard-orb-cyan" />
      <div className="dashboard-orb dashboard-orb-purple" />
      <div className="dashboard-orb dashboard-orb-pink" />

      <div className="dashboard-layout">
        <aside className={`dashboard-sidebar ${sidebarOpen ? '' : 'sidebar-closed'}`}>
          <div className="sidebar-header">
            <div className="sidebar-logo">
              <button
                className="sidebar-icon-button"
                onClick={() => setSidebarOpen((open) => !open)}
                aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
                type="button"
              >
                <Menu className="sidebar-menu-icon" />
              </button>
              {sidebarOpen && <span>GEUWAT ADMIN</span>}
            </div>
          </div>
          <nav className="sidebar-nav">
            <ul className="sidebar-menu">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href)
                return (
                  <li key={item.href} className="sidebar-menu-item">
                    <Link
                      href={item.href}
                      className={`sidebar-menu-link ${isActive ? 'active' : ''}`}
                    >
                      <Icon className="sidebar-menu-icon" />
                      {sidebarOpen && <span>{item.label}</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        </aside>

        <main className="dashboard-main">
          <header className="dashboard-header">
            <div className="header-content">
              <div className="flex items-center gap-3">
                <h1 className="header-title">{pageTitle}</h1>
              </div>
              <div className="header-actions">
                <RefreshButton onRefresh={refreshAuth} />
                <button className="logout-button" onClick={handleLogout} type="button">
                  <LogOut className="logout-icon" />
                  Logout
                </button>
              </div>
            </div>
          </header>

          <div className="dashboard-content">{children}</div>
        </main>
      </div>
    </div>
  )
}
