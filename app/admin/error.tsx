'use client'

import React from 'react'

export default function AdminError({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="dashboard-container">
      <div className="dashboard-background"></div>
      <div className="dashboard-content">
        <div className="dashboard-card">
          <div className="card-header">
            <h2 className="card-title">Terjadi Kesalahan</h2>
          </div>
          <div className="card-content">
            <p className="text-gray-300">
              Ada masalah saat memuat halaman admin. Silakan coba lagi.
            </p>
            {error?.message && (
              <p className="text-red-400 mt-4">{error.message}</p>
            )}
            <div className="mt-6 flex gap-3 flex-wrap">
              <button className="btn btn-primary" onClick={() => reset()}>
                Coba Lagi
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => window.location.reload()}
              >
                Refresh Halaman
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
