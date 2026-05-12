'use client'

import type { ReactNode } from 'react'

type AlertVariant = 'error' | 'warning' | 'success' | 'info'

const STYLES: Record<AlertVariant, string> = {
  error: 'border-danger/40   bg-danger/10   text-danger',
  warning: 'border-warning/40  bg-warning/10  text-warning',
  success: 'border-success/40  bg-success/10  text-success',
  info: 'border-accent/30   bg-accent/5    text-accent',
}

interface AlertBannerProps {
  variant?: AlertVariant
  children: ReactNode
  className?: string
}

/**
 * Inline contextual banner. Use for page-level error / success / warning messages.
 * Follows the design-token color system (no raw hex/arbitrary colors).
 */
export function AlertBanner({ variant = 'info', children, className = '' }: AlertBannerProps) {
  return (
    <div
      role="alert"
      className={`rounded-2xl border px-4 py-3 text-sm font-medium ${STYLES[variant]} ${className}`.trim()}
    >
      {children}
    </div>
  )
}
