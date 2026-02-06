import React from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error'
  children: React.ReactNode
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'success',
  className,
  children,
  ...props
}) => {
  const variantClasses = {
    success: 'badge-success',
    warning: 'badge-warning',
    error: 'badge-error'
  }

  return (
    <span
      className={cn(
        'badge',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
