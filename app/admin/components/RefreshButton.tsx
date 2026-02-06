'use client'

import React from 'react'
import { RefreshCw } from 'lucide-react'

interface RefreshButtonProps {
  onRefresh: () => void
  className?: string
  title?: string
}

export default function RefreshButton({ 
  onRefresh, 
  className = '', 
  title = 'Refresh Data' 
}: RefreshButtonProps) {
  return (
    <button
      onClick={onRefresh}
      className={`btn btn-secondary btn-sm flex items-center gap-2 ${className}`}
      title={title}
    >
      <RefreshCw className="w-4 h-4" />
      Refresh
    </button>
  )
}
