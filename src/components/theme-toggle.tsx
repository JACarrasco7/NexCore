'use client'

import { useTheme } from '@/components/theme-provider'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <button
      onClick={toggle}
      aria-pressed={mounted ? theme === 'dark' : undefined}
      aria-label={
        mounted
          ? theme === 'dark'
            ? 'Activar modo claro'
            : 'Activar modo oscuro'
          : 'Alternar tema'
      }
      title={mounted ? (theme === 'dark' ? 'Modo claro' : 'Modo oscuro') : 'Alternar tema'}
      className="border-line bg-surface hover:border-accent/40 hover:bg-accent-soft flex h-9 w-9 items-center justify-center rounded-xl border text-base transition"
    >
      {mounted ? theme === 'dark' ? '☀️' : '🌙' : <span className="opacity-0">🌙</span>}
    </button>
  )
}
