'use client'

import { useEffect, useState } from 'react'

type ViewMode = 'table' | 'list'

interface ViewModeToggleProps {
  value: ViewMode
  onChange: (mode: ViewMode) => void
  storageKey?: string
}

export function ViewModeToggle({ value, onChange, storageKey = 'view-mode' }: ViewModeToggleProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Load from localStorage on mount
    const saved = localStorage.getItem(storageKey) as ViewMode | null
    if (saved && (saved === 'table' || saved === 'list')) {
      onChange(saved)
    }
  }, [])

  const handleChange = (mode: ViewMode) => {
    onChange(mode)
    if (mounted) {
      localStorage.setItem(storageKey, mode)
    }
  }

  if (!mounted) return null

  return (
    <div className="border-line bg-surface-strong flex items-center gap-1 rounded-xl border p-1">
      <button
        onClick={() => handleChange('table')}
        title="Vista en tabla"
        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
          value === 'table'
            ? 'bg-accent/15 text-accent'
            : 'text-foreground/60 hover:text-foreground'
        }`}
      >
        📊 Tabla
      </button>
      <button
        onClick={() => handleChange('list')}
        title="Vista en lista"
        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
          value === 'list' ? 'bg-accent/15 text-accent' : 'text-foreground/60 hover:text-foreground'
        }`}
      >
        📋 Lista
      </button>
    </div>
  )
}
