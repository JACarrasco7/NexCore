'use client'

import React from 'react'

interface ListItem<T> {
  id: string
  title: string
  subtitle?: string
  icon?: React.ReactNode
  badge?: { label: string; color?: 'success' | 'warning' | 'danger' | 'info' }
  metadata?: string[]
  onClick?: (item: T) => void
  actions?: React.ReactNode
}

interface DataListProps<T extends Record<string, any>> {
  items: ListItem<T>[]
  emptyText?: string
  spacing?: 'compact' | 'normal' | 'comfortable'
}

export function DataList<T extends Record<string, any>>({
  items,
  emptyText = 'Sin elementos',
  spacing = 'normal',
}: DataListProps<T>) {
  if (items.length === 0) {
    return (
      <div className="border-line bg-surface flex items-center justify-center rounded-2xl border border-dashed py-12">
        <p className="text-foreground/40 text-sm">{emptyText}</p>
      </div>
    )
  }

  const paddingClass = {
    compact: 'px-3 py-2',
    normal: 'px-4 py-3',
    comfortable: 'px-5 py-4',
  }[spacing]

  const badgeColorMap = {
    success: 'bg-success/10 text-success border-success/30',
    warning: 'bg-warning/10 text-warning border-warning/30',
    danger: 'bg-danger/10 text-danger border-danger/30',
    info: 'bg-accent/10 text-accent border-accent/30',
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          onClick={() => item.onClick?.(item as any)}
          className={`border-line bg-surface flex items-center gap-3 rounded-2xl border transition ${
            item.onClick ? 'hover:border-accent/30 hover:bg-surface-strong/50 cursor-pointer' : ''
          } ${paddingClass}`}
        >
          {/* Icon */}
          {item.icon && <div className="shrink-0 text-2xl">{item.icon}</div>}

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-foreground truncate font-semibold">{item.title}</p>
              {item.badge && (
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${
                    badgeColorMap[item.badge.color ?? 'info']
                  }`}
                >
                  {item.badge.label}
                </span>
              )}
            </div>
            {item.subtitle && (
              <p className="text-foreground/50 mt-0.5 truncate text-xs">{item.subtitle}</p>
            )}
            {item.metadata && item.metadata.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {item.metadata.map((meta, i) => (
                  <span key={i} className="text-foreground/40 text-xs">
                    {meta}
                    {i < item.metadata!.length - 1 && <span className="ml-1.5">·</span>}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          {item.actions && <div className="shrink-0">{item.actions}</div>}
        </div>
      ))}
    </div>
  )
}
