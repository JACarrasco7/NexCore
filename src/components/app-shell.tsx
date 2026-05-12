'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'

import { UserMenu } from '@/components/user-menu'
import { FloatingChat } from '@/components/floating-chat'
import { NotificationBell } from '@/components/notification-bell'
import { ThemeToggle } from '@/components/theme-toggle'

type AppShellProps = {
  children: ReactNode
}

type NavGroup = {
  label: string
  icon: string
  routes: { href: string; label: string; icon: string }[]
}

const COACH_NAV_GROUPS: NavGroup[] = [
  {
    label: 'Atletas',
    icon: '👥',
    routes: [
      { href: '/coach/athletes', label: 'Lista de atletas', icon: '👥' },
      { href: '/coach/compare', label: 'Comparar', icon: '📊' },
    ],
  },
  {
    label: 'Entrenamiento',
    icon: '🏋️',
    routes: [
      { href: '/coach/plans/new', label: 'Crear plan', icon: '✍️' },
      { href: '/coach/import-lab', label: 'Importar rutinas (CSV)', icon: '📥' },
    ],
  },
  {
    label: 'Nutrición',
    icon: '🥗',
    routes: [
      { href: '/coach/nutrition', label: 'Planes de nutrición', icon: '🥗' },
      { href: '/coach/import-lab/nutrition', label: 'Importar nutrición', icon: '📥' },
    ],
  },
  {
    label: 'Comunicación',
    icon: '💬',
    routes: [
      { href: '/coach/messages', label: 'Mensajes', icon: '💬' },
      { href: '/coach/wall', label: 'Muro del equipo', icon: '📢' },
    ],
  },
  {
    label: 'Team',
    icon: '👨‍💼',
    routes: [
      { href: '/coach/team', label: 'Gestión de equipo', icon: '👨‍💼' },
      { href: '/coach/team/billing', label: 'Facturación', icon: '💳' },
      { href: '/coach/service-plans', label: 'Planes de servicio', icon: '💎' },
    ],
  },
]

const ATHLETE_NAV_GROUPS: NavGroup[] = [
  {
    label: 'Entrenamiento',
    icon: '🏋️',
    routes: [
      { href: '/athlete/plan', label: 'Mi rutina', icon: '🏋️' },
      { href: '/athlete/training-log', label: 'Registro de entrenamientos', icon: '📝' },
    ],
  },
  {
    label: 'Revisiones',
    icon: '📊',
    routes: [
      { href: '/athlete/check-in', label: 'Revisión periódica', icon: '✅' },
      { href: '/athlete/daily-log', label: 'Log diario', icon: '📋' },
    ],
  },
  {
    label: 'Nutrición',
    icon: '🥗',
    routes: [{ href: '/athlete/nutrition', label: 'Nutrición', icon: '🥗' }],
  },
  {
    label: 'Progreso',
    icon: '📸',
    routes: [{ href: '/athlete/progress', label: 'Fotos de progreso', icon: '📸' }],
  },
  {
    label: 'Social',
    icon: '💬',
    routes: [
      { href: '/athlete/chat', label: 'Chat con coach', icon: '💬' },
      { href: '/athlete/wall', label: 'Muro del equipo', icon: '📢' },
    ],
  },
]

export function AppShell({ children }: AppShellProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const role = (session?.user as { role?: string })?.role
  const navGroups = role === 'COACH' || role === 'ADMIN' ? COACH_NAV_GROUPS : ATHLETE_NAV_GROUPS

  const [unread, setUnread] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Verificar si tiene perfil completo → redirigir a /onboarding si no
  useEffect(() => {
    if (
      !session?.user ||
      pathname.startsWith('/onboarding') ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/register')
    )
      return
    fetch('/api/me/profile-status')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { hasProfile: boolean; role: string } | null) => {
        if (d && !d.hasProfile) router.push('/onboarding')
      })
      .catch(() => {})
  }, [session?.user, pathname, router])

  // Poll unread count cada 15 s
  useEffect(() => {
    if (!session?.user) return
    let active = true
    async function refresh() {
      const r = await fetch('/api/messages/unread-count').catch(() => null)
      if (r?.ok && active) {
        const d = (await r.json()) as { count: number }
        setUnread(d.count)
      }
    }
    refresh()
    const id = setInterval(refresh, 15_000)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [session?.user])

  // Cerrar menú al clicar fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Cerrar menú al navegar
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  function isActive(href: string): boolean {
    return pathname === href || (href !== '/' && pathname.startsWith(href) && href.length > 1)
  }

  // Desktop: Dropdown navbar
  function NavDropdown({ group }: { group: NavGroup }) {
    const [open, setOpen] = useState(false)
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const isGroupActive = group.routes.some((r) => isActive(r.href))

    function handleMouseEnter() {
      if (closeTimer.current) clearTimeout(closeTimer.current)
      setOpen(true)
    }

    function handleMouseLeave() {
      closeTimer.current = setTimeout(() => {
        setOpen(false)
      }, 150) // 150ms grace period para que el cursor cruce el gap
    }

    return (
      <div className="group relative">
        <button
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
            isGroupActive
              ? 'border-accent/40 bg-accent/12 text-accent'
              : 'text-foreground/70 hover:border-line hover:bg-surface hover:text-foreground border-transparent'
          }`}
        >
          <span className="text-xs">{group.icon}</span>
          {group.label}
          <span className="text-xs opacity-50">▼</span>
        </button>

        {/* Dropdown menu */}
        {open && (
          <div
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="border-line bg-surface-strong absolute top-full left-0 z-40 w-48 overflow-hidden rounded-2xl border shadow-lg"
          >
            {group.routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={`flex items-center gap-2.5 px-4 py-3 text-sm transition ${
                  isActive(route.href)
                    ? 'bg-accent/12 text-accent'
                    : 'text-foreground/70 hover:bg-surface hover:text-foreground'
                }`}
              >
                <span className="text-xs">{route.icon}</span>
                {route.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative flex min-h-full flex-col">
      <header className="border-line bg-background/80 sticky top-0 z-20 border-b backdrop-blur-xl">
        {/* accent top line */}
        <div className="via-accent h-0.5 w-full bg-linear-to-r from-transparent to-transparent opacity-60" />
        <div className="mx-auto flex w-full max-w-[1480px] items-center justify-between gap-6 px-6 py-3 md:px-10 lg:px-12">
          <Link
            href={role === 'COACH' || role === 'ADMIN' ? '/coach' : '/athlete'}
            className="flex items-center gap-3"
          >
            <span className="from-accent to-accent-strong flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br text-xs font-bold text-white shadow-[0_4px_14px_var(--accent-glow)]">
              NX
            </span>
            <div>
              <p className="text-accent text-base font-semibold">NEXUM</p>
              <p className="text-foreground/50 text-xs">
                {role === 'COACH' || role === 'ADMIN' ? 'Coach workspace' : 'Athlete view'}
              </p>
            </div>
          </Link>

          {/* Desktop nav with dropdowns */}
          <nav className="hidden items-center gap-1 lg:flex">
            {navGroups.map((group) => (
              <NavDropdown key={group.label} group={group} />
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {/* Hamburger — visible en < lg */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav-drawer"
              className="border-line bg-surface hover:bg-surface-strong relative flex h-9 w-9 items-center justify-center rounded-xl border transition lg:hidden"
            >
              <span className="sr-only">Menú</span>
              <svg
                width="18"
                height="14"
                viewBox="0 0 18 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <line x1="0" y1="1" x2="18" y2="1" />
                <line x1="0" y1="7" x2="18" y2="7" />
                <line x1="0" y1="13" x2="18" y2="13" />
              </svg>
              {unread > 0 && (
                <span className="bg-danger absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
            {(role === 'COACH' || role === 'ADMIN') && <NotificationBell />}
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>

        {/* Mobile drawer with collapsible groups */}
        {menuOpen && (
          <div
            id="mobile-nav-drawer"
            ref={menuRef}
            className="border-line bg-background/97 absolute inset-x-0 top-full z-30 max-h-[70vh] overflow-y-auto border-b backdrop-blur-xl lg:hidden"
          >
            <nav className="mx-auto flex w-full max-w-[1480px] flex-col gap-1 px-6 py-4 md:px-10">
              {navGroups.map((group) => {
                const groupActive = group.routes.some((r) => isActive(r.href))
                const groupOpen = openDropdown === group.label

                return (
                  <div key={group.label}>
                    <button
                      onClick={() => setOpenDropdown(groupOpen ? null : group.label)}
                      className={`flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-sm font-medium transition ${
                        groupActive
                          ? 'bg-accent/12 text-accent'
                          : 'text-foreground/70 hover:bg-surface hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-base">{group.icon}</span>
                        {group.label}
                      </div>
                      <span className="text-xs">{groupOpen ? '▲' : '▼'}</span>
                    </button>

                    {/* Sub-routes */}
                    {groupOpen && (
                      <div className="border-line/30 mt-1 ml-4 space-y-1 border-l py-1 pl-4">
                        {group.routes.map((route) => {
                          const routeActive = isActive(route.href)
                          return (
                            <Link
                              key={route.href}
                              href={route.href}
                              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                                routeActive
                                  ? 'bg-accent/10 text-accent font-semibold'
                                  : 'text-foreground/60 hover:text-foreground'
                              }`}
                            >
                              <span className="text-xs">{route.icon}</span>
                              {route.label}
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </nav>
          </div>
        )}
      </header>

      {children}

      <footer
        className={`border-line mt-auto border-t ${pathname.startsWith('/coach') || pathname.startsWith('/athlete') ? '' : ''}`}
      >
        <div
          className={`text-foreground/45 mx-auto flex w-full max-w-[1480px] items-center justify-between gap-2 px-6 text-xs md:px-10 lg:px-12 ${pathname.startsWith('/coach') || pathname.startsWith('/athlete') ? 'py-2' : 'flex-col py-5 lg:flex-row'}`}
        >
          <div className="flex items-center gap-2">
            <span className="from-accent to-accent-strong flex h-5 w-5 items-center justify-center rounded bg-linear-to-br text-[9px] font-bold text-white">
              NX
            </span>
            <span>NEXUM · CARRIX Techv 0.1</span>
          </div>
          {!(pathname.startsWith('/coach') || pathname.startsWith('/athlete')) && (
            <p>Coach-athlete workflow · Next.js + Prisma + NextAuth</p>
          )}
        </div>
      </footer>

      {/* Burbuja de chat flotante — visible para todos los roles autenticados */}
      {session?.user && <FloatingChat unread={unread} />}
    </div>
  )
}
