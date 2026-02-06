'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import './admin/styles/dashboard.css'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    router.push('/admin/login')
  }, [router])

  return (
    <div className="loading-container">
      <div className="loading-content">
        <div className="loading-spinner-large"></div>
        <p>Redirecting to login...</p>
      </div>
    </div>
  )
}
