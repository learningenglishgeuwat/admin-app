'use client'

import dynamic from 'next/dynamic'

const HistoryClient = dynamic(() => import('./HistoryClient'), {
  ssr: false,
  loading: () => (
    <div className="dashboard-loading">
      <div className="loading-spinner-large"></div>
      <p>Loading...</p>
    </div>
  )
})

export default function Page() {
  return <HistoryClient />
}
