'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ChatPanel } from '@/components/chat-panel'
import { PageShell, PageHeader } from '@/components/layout'

type InboxItem = {
  athleteId: string
  userId: string
  displayName: string
  lastMessage: { content: string; createdAt: string; fromMe: boolean } | null
  unreadCount: number
}

type AthleteKpi = {
  fullName: string
  goal: string
  phaseLabel: string
  avgAdherence: number | null
  activePlanTitle: string | null
  lastCheckIn: { date: string; weightKg: number; adherencePct: number } | null
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'ahora'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

function AthleteKpiPanel({ athleteId }: { athleteId: string }) {
  const [data, setData] = useState<AthleteKpi | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setData(null)
    fetch(`/api/athletes/${athleteId}/overview`)
      .then((r) => r.json())
      .then((d) => {
        const lastCheckIn = d.checkIns?.[0] ?? null
        const activePlan =
          d.plans?.find((p: { isActive?: boolean; title: string }) => p.isActive) ??
          d.plans?.[0] ??
          null
        setData({
          fullName: d.fullName ?? 'Atleta',
          goal: d.goal ?? '—',
          phaseLabel: d.phaseLabel ?? '—',
          avgAdherence: d.avgAdherence ?? null,
          activePlanTitle: activePlan?.title ?? null,
          lastCheckIn: lastCheckIn
            ? {
                date: lastCheckIn.date,
                weightKg: lastCheckIn.weightKg,
                adherencePct: lastCheckIn.adherencePct,
              }
            : null,
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [athleteId])

  if (loading) {
    return (
      <div className="space-y-3 p-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-surface-strong h-10 animate-pulse rounded-xl" />
        ))}
      </div>
    )
  }
  if (!data) return <p className="text-foreground/40 p-5 text-sm">Sin datos</p>

  const goalLabels: Record<string, string> = {
    volumen: 'Volumen',
    definicion: 'Definición',
    mantenimiento: 'Mantenimiento',
    'peak-week': 'Peak Week',
  }
  const goalTones: Record<string, string> = {
    volumen: 'text-success',
    definicion: 'text-warning',
    mantenimiento: 'text-foreground/50',
    'peak-week': 'text-danger',
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Cabecera atleta */}
      <div className="border-line border-b p-5">
        <div className="flex items-center gap-3">
          <div className="bg-accent/10 text-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold">
            {data.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm leading-tight font-semibold">{data.fullName}</p>
            <p className={`text-xs font-medium ${goalTones[data.goal] ?? 'text-foreground/50'}`}>
              {goalLabels[data.goal] ?? data.goal}
            </p>
          </div>
        </div>
        <p className="text-foreground/45 mt-2 text-xs">{data.phaseLabel}</p>
      </div>

      {/* KPIs */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {data.avgAdherence != null && (
          <div className="border-line bg-background rounded-xl border p-3">
            <p className="text-foreground/40 text-[10px] tracking-widest uppercase">
              Adherencia media
            </p>
            <p
              className={`mt-0.5 text-2xl font-bold ${
                data.avgAdherence >= 80
                  ? 'text-success'
                  : data.avgAdherence >= 60
                    ? 'text-warning'
                    : 'text-danger'
              }`}
            >
              {data.avgAdherence}%
            </p>
            <div className="bg-surface-strong mt-2 h-1.5 overflow-hidden rounded-full">
              <div
                className="bg-accent h-full rounded-full transition-all"
                style={{ width: `${data.avgAdherence}%` }}
              />
            </div>
          </div>
        )}

        {data.lastCheckIn && (
          <div className="border-line bg-background space-y-2 rounded-xl border p-3">
            <p className="text-foreground/40 text-[10px] tracking-widest uppercase">
              Último check-in
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-foreground/45 text-xs">Peso</p>
                <p className="text-base font-semibold">{data.lastCheckIn.weightKg} kg</p>
              </div>
              <div>
                <p className="text-foreground/45 text-xs">Adherencia</p>
                <p className="text-base font-semibold">{data.lastCheckIn.adherencePct}%</p>
              </div>
            </div>
            <p className="text-foreground/35 text-xs">
              {new Date(data.lastCheckIn.date).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
              })}
            </p>
          </div>
        )}

        {data.activePlanTitle && (
          <div className="border-line bg-background rounded-xl border p-3">
            <p className="text-foreground/40 text-[10px] tracking-widest uppercase">Plan activo</p>
            <p className="mt-0.5 truncate text-sm font-semibold">{data.activePlanTitle}</p>
          </div>
        )}

        <Link
          href={`/coach/athletes/${athleteId}`}
          className="border-accent/30 bg-accent/5 text-accent hover:bg-accent/10 flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold transition"
        >
          Ver perfil completo →
        </Link>
      </div>
    </div>
  )
}

export default function CoachMessagesPage() {
  const [inbox, setInbox] = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<InboxItem | null>(null)

  const loadInbox = useCallback(() => {
    fetch('/api/coach/inbox')
      .then((r) => r.json())
      .then((d) => {
        setInbox(Array.isArray(d) ? d : (d?.conversations ?? []))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadInbox()
  }, [loadInbox])

  function selectAthlete(item: InboxItem) {
    setSelected(item)
    setInbox((prev) => prev.map((i) => (i.userId === item.userId ? { ...i, unreadCount: 0 } : i)))
  }

  const totalUnread = inbox.reduce((s, i) => s + i.unreadCount, 0)

  return (
    <PageShell>
      <PageHeader
        eyebrow="Coach dashboard"
        title="Mensajes"
        actions={
          totalUnread > 0 ? (
            <span className="bg-accent rounded-full px-3 py-1 text-xs font-bold text-white">
              {totalUnread} sin leer
            </span>
          ) : undefined
        }
      />

      {/* 3-column chat layout */}
      <div className="border-line bg-surface-strong grid h-[calc(100vh-180px)] overflow-hidden rounded-2xl border lg:grid-cols-[280px_1fr] xl:grid-cols-[280px_1fr_300px]">
        {/* Col 1: lista de contactos */}
        <aside className="border-line flex flex-col overflow-hidden border-r">
          <div className="border-line border-b px-4 py-3">
            <p className="text-foreground/45 text-xs font-semibold tracking-widest uppercase">
              Conversaciones
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-2 p-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-background h-14 animate-pulse rounded-xl" />
                ))}
              </div>
            ) : inbox.length === 0 ? (
              <p className="text-foreground/40 p-4 text-sm">Ningún atleta tiene cuenta aún.</p>
            ) : (
              <div className="space-y-0.5 p-2">
                {inbox.map((item) => (
                  <button
                    key={item.userId}
                    onClick={() => selectAthlete(item)}
                    className={`w-full rounded-xl px-3 py-3 text-left transition ${
                      selected?.userId === item.userId
                        ? 'bg-accent/10 border-accent/20 border'
                        : 'hover:bg-background/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="bg-accent/10 text-accent flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold">
                          {item.displayName.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate text-sm font-semibold">{item.displayName}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {item.unreadCount > 0 && (
                          <span className="bg-accent flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white">
                            {item.unreadCount}
                          </span>
                        )}
                        {item.lastMessage && (
                          <span className="text-foreground/30 text-[10px]">
                            {formatRelative(item.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    {item.lastMessage ? (
                      <p className="text-foreground/45 mt-0.5 ml-10 truncate text-xs">
                        {item.lastMessage.fromMe ? 'Tú: ' : ''}
                        {item.lastMessage.content}
                      </p>
                    ) : (
                      <p className="text-foreground/25 mt-0.5 ml-10 text-xs italic">
                        Sin mensajes aún
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Col 2: hilo de chat */}
        <div className="flex min-w-0 flex-col overflow-hidden">
          {selected ? (
            <ChatPanel
              withUserId={selected.userId}
              withName={selected.displayName}
              athleteId={selected.athleteId}
            />
          ) : (
            <div className="text-foreground/30 flex h-full flex-col items-center justify-center gap-2">
              <span className="text-4xl">💬</span>
              <p className="text-sm">Selecciona una conversación</p>
            </div>
          )}
        </div>

        {/* Col 3: metadata del atleta (solo xl) */}
        <aside className="border-line hidden overflow-hidden border-l xl:flex xl:flex-col">
          {selected ? (
            <AthleteKpiPanel athleteId={selected.athleteId} />
          ) : (
            <div className="text-foreground/25 flex h-full flex-col items-center justify-center gap-1">
              <span className="text-3xl">👤</span>
              <p className="text-xs">Selecciona un atleta</p>
            </div>
          )}
        </aside>
      </div>
    </PageShell>
  )
}
