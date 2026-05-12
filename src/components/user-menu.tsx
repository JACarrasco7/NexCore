'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

export function UserMenu() {
  const { data: session, status } = useSession()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  if (status === 'loading') {
    return <div className="bg-surface-strong h-8 w-8 animate-pulse rounded-full" />
  }

  if (!session?.user) {
    return (
      <Link
        href="/login"
        className="border-line bg-surface-strong hover:border-accent/40 rounded-full border px-4 py-1.5 text-xs font-medium transition"
      >
        Iniciar sesión
      </Link>
    )
  }

  const initials = (session.user.name ?? session.user.email ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const role = (session.user as { role?: string }).role
  const roleLabel = role === 'COACH' ? 'Coach' : role === 'ADMIN' ? 'Admin' : 'Atleta'

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-3">
        <div className="hidden flex-col items-end md:flex">
          <span className="text-xs leading-none font-medium">
            {session.user.name ?? session.user.email}
          </span>
          <span className="text-foreground/50 mt-0.5 text-[10px]">{roleLabel}</span>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Abrir menú de usuario"
          className="from-accent to-accent-strong flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br text-xs font-bold text-white shadow-[0_2px_10px_var(--accent-glow)] transition hover:shadow-[0_4px_16px_var(--accent-glow)]"
        >
          {initials}
        </button>
      </div>

      {open && (
        <div className="border-line bg-surface-strong absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border shadow-lg">
          {/* User info header */}
          <div className="border-line/50 border-b px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="bg-accent/15 text-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {session.user.name ?? session.user.email}
                </p>
                <p className="text-foreground/50 truncate text-xs">{session.user.email}</p>
                <p className="text-accent mt-1 text-xs font-medium">
                  {roleLabel === 'Coach' && '👨‍💼'}
                  {roleLabel === 'Admin' && '👑'}
                  {roleLabel === 'Atleta' && '🏋️'} {roleLabel}
                </p>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <nav className="flex flex-col space-y-0.5 p-2">
            {role === 'COACH' || role === 'ADMIN' ? (
              <>
                <Link
                  href="/coach/profile"
                  className="text-foreground/80 hover:bg-surface flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition"
                >
                  <span>👤</span> Mi perfil
                </Link>
                <Link
                  href="/coach/team/settings"
                  className="text-foreground/80 hover:bg-surface flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition"
                >
                  <span>⚙️</span> Configuración
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/athlete/settings"
                  className="text-foreground/80 hover:bg-surface flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition"
                >
                  <span>👤</span> Mi perfil
                </Link>
                <Link
                  href="/athlete/preferences"
                  className="text-foreground/80 hover:bg-surface flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition"
                >
                  <span>⚙️</span> Preferencias
                </Link>
              </>
            )}
            <hr className="border-line/50 my-1 border-t" />
            <button
              onClick={() => {
                setOpen(false)
                void signOut({ callbackUrl: '/login' })
              }}
              className="text-danger hover:bg-danger/10 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition"
            >
              <span>🚪</span> Cerrar sesión
            </button>
          </nav>
        </div>
      )}
    </div>
  )
}
