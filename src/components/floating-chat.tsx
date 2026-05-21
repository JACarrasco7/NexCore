'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ChatPanel } from '@/components/chat-panel'
import { apiFetch } from '@/lib/store'

// ── Tipos ────────────────────────────────────────────────────────────────────
type InboxItem = {
  athleteId: string
  userId: string
  displayName: string
  lastMessage: { content: string; createdAt: string; fromMe: boolean } | null
  unreadCount: number
}

type CoachInfo = { id: string; userId: string; displayName: string }

// ── Icono de burbuja de chat ──────────────────────────────────────────────────
function BubbleIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

// ── FloatingChat ─────────────────────────────────────────────────────────────
export function FloatingChat({ unread = 0 }: { unread?: number }) {
  const { data: session } = useSession()
  const router = useRouter()
  const role = (session?.user as { role?: string })?.role
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Estado para atleta (coach → lista de atletas)
  const [inbox, setInbox] = useState<InboxItem[]>([])
  const [selectedAthlete, setSelectedAthlete] = useState<InboxItem | null>(null)

  // Estado para atleta (athlete → su coach)
  const [coachInfo, setCoachInfo] = useState<CoachInfo | null>(null)
  const [loadingCoach, setLoadingCoach] = useState(false)

  // Cerrar al clicar fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Cuando se abre: cargar datos según rol
  useEffect(() => {
    if (!open) return
    if (role === 'COACH' || role === 'ADMIN') {
      apiFetch('/api/coach/inbox')
        .then((d: any) => setInbox(Array.isArray(d) ? d : d?.conversations ?? []))
        .catch(() => {})
    } else if (role === 'ATHLETE') {
      if (coachInfo) return
      setLoadingCoach(true)
      apiFetch('/api/me/coach-for-athlete')
        .then((d: any) => {
          if (d) setCoachInfo(d)
        })
        .catch(() => {})
        .finally(() => setLoadingCoach(false))
    }
  }, [open, role, coachInfo])

  if (!session?.user) return null

  // ── Contenido del panel según rol ─────────────────────────────────────────
  function PanelContent() {
    if (role === 'ATHLETE') {
      if (loadingCoach)
        return <p className="text-foreground/50 p-6 text-sm">Buscando tu coach...</p>
      if (!coachInfo)
        return (
          <div className="text-foreground/50 p-6 text-sm">
            <p>No tienes coach asignado aún.</p>
          </div>
        )
      return <ChatPanel withUserId={coachInfo.userId} withName={coachInfo.displayName} />
    }

    // COACH / ADMIN
    if (selectedAthlete) {
      return (
        <div className="flex h-full flex-col">
          <button
            onClick={() => setSelectedAthlete(null)}
            className="border-line text-foreground/60 hover:text-foreground flex items-center gap-2 border-b px-4 py-2.5 text-xs transition"
          >
            ← Todos los atletas
          </button>
          <div className="flex-1 overflow-hidden">
            <ChatPanel
              withUserId={selectedAthlete.userId}
              withName={selectedAthlete.displayName}
              athleteId={selectedAthlete.athleteId}
            />
          </div>
        </div>
      )
    }

    return (
      <div className="flex h-full flex-col">
        <div className="border-line border-b px-4 py-3">
          <p className="text-sm font-semibold">Conversaciones</p>
        </div>
        {inbox.length === 0 ? (
          <p className="text-foreground/50 p-6 text-sm">
            Ningún atleta tiene cuenta de usuario aún.
          </p>
        ) : (
          <ul className="flex-1 overflow-y-auto">
            {inbox.map((item) => (
              <li key={item.userId}>
                <button
                  onClick={() => setSelectedAthlete(item)}
                  className="hover:bg-surface-strong border-line/50 w-full border-b px-4 py-3 text-left transition last:border-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{item.displayName}</span>
                    {item.unreadCount > 0 && (
                      <span className="bg-danger flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white">
                        {item.unreadCount}
                      </span>
                    )}
                  </div>
                  {item.lastMessage && (
                    <p className="text-foreground/50 mt-0.5 truncate text-xs">
                      {item.lastMessage.fromMe ? 'Tú: ' : ''}
                      {item.lastMessage.content}
                    </p>
                  )}
                  {!item.lastMessage && (
                    <p className="text-foreground/30 mt-0.5 text-xs italic">Sin mensajes aún</p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <div className="fixed right-6 bottom-6 z-50 flex flex-col items-end gap-3" ref={panelRef}>
      {/* Panel */}
      {open && (
        <div className="border-line bg-background animate-in slide-in-from-bottom-4 flex max-h-130 w-85 flex-col overflow-hidden rounded-3xl border shadow-2xl duration-200">
          {/* Header del panel */}
          <div className="border-line flex shrink-0 items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="bg-accent/15 text-accent flex h-7 w-7 items-center justify-center rounded-full">
                <BubbleIcon />
              </span>
              <p className="text-sm font-semibold">
                {role === 'ATHLETE' ? (coachInfo?.displayName ?? 'Chat con tu coach') : 'Mensajes'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  // Maximizar / ir a la página completa del chat
                  if (role === 'COACH' || role === 'ADMIN') router.push('/coach/messages')
                  else router.push('/athlete/chat')
                }}
                className="text-foreground/40 hover:bg-surface-strong hover:text-foreground flex h-7 w-7 items-center justify-center rounded-full transition"
                aria-label="Abrir chat completo"
                title="Abrir chat completo"
              >
                ↗
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-foreground/40 hover:bg-surface-strong hover:text-foreground flex h-7 w-7 items-center justify-center rounded-full transition"
                aria-label="Cerrar chat"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <PanelContent />
          </div>
        </div>
      )}

      {/* Botón burbuja */}
      <button
        onClick={() => {
          setOpen((v) => !v)
          if (!open) setSelectedAthlete(null)
        }}
        aria-label="Chat"
        className="bg-accent hover:bg-accent-strong flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition active:scale-95"
      >
        {open ? (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <>
            <BubbleIcon />
            {unread > 0 && (
              <span className="bg-danger absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </>
        )}
      </button>
    </div>
  )
}
