'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  /** Right-side slot: buttons, toggles, etc. */
  actions?: ReactNode
  /** Shows a ← back link above the eyebrow */
  back?: { href: string; label?: string }
}

/**
 * Standardised page header for operational / list pages.
 * Use `SectionIntro` for hero/tool standalone pages instead.
 */
export function PageHeader({ eyebrow, title, description, actions, back }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {back && (
          <Link
            href={back.href}
            className="text-foreground/40 hover:text-foreground/70 mb-2 inline-flex items-center gap-1 text-xs transition"
          >
            ← {back.label ?? 'Volver'}
          </Link>
        )}
        {eyebrow && (
          <p className="text-foreground/40 text-xs font-semibold tracking-widest uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-0.5 text-2xl leading-tight font-bold">{title}</h1>
        {description && <p className="text-foreground/55 mt-1 text-sm">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
    </div>
  )
}
