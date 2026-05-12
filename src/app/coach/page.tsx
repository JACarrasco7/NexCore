import Link from 'next/link'
import { redirect } from 'next/navigation'
import { StatCard } from '@/components/stat-card'
import { auth } from '@/auth'
import { getCoachToday } from '@/lib/coach-today'

export const dynamic = 'force-dynamic'

function formatDate(value: string | null) {
  if (!value) return 'Sin registro'
  return new Date(value).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

export default async function CoachPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const today = await getCoachToday(session.user.id)
  const coachStats = [
    {
      label: 'Atletas activos',
      value: String(today.stats.totalAthletes),
      detail: 'en seguimiento',
      tone: 'default' as const,
    },
    {
      label: 'Pendientes',
      value: String(today.stats.pendingCheckIns),
      detail: 'sin check-in reciente',
      tone: today.stats.pendingCheckIns > 0 ? ('warning' as const) : ('success' as const),
    },
    {
      label: 'Alertas',
      value: String(today.stats.atRisk),
      detail: 'adherencia o sueño bajos',
      tone: today.stats.atRisk > 0 ? ('danger' as const) : ('success' as const),
    },
    {
      label: 'Adherencia media',
      value: today.stats.avgAdherence !== null ? `${today.stats.avgAdherence}%` : '—',
      detail: `${today.stats.sessionsLast7d} sesiones en 7 días`,
      tone:
        today.stats.avgAdherence !== null && today.stats.avgAdherence >= 80
          ? ('success' as const)
          : ('warning' as const),
    },
  ]

  return (
    <div className="mx-auto w-full max-w-[1480px] space-y-6 px-6 py-6 md:px-10 lg:px-12">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-foreground/40 text-xs tracking-widest uppercase">Dashboard coach</p>
          <h1 className="mt-1 text-2xl font-bold">{today.coach.displayName}</h1>
        </div>
        <div className="text-foreground/40 flex items-center gap-2 text-xs">
          <span>{today.stats.unreadNotifications} notif.</span>
          <span className="text-line">·</span>
          <span>{today.stats.unreadMessages} mensajes</span>
        </div>
      </div>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {coachStats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </section>

      {/* Main layout: cola operativa + actividad reciente + aside acciones */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_300px] xl:items-start">
        {/* Cola operativa */}
        <div className="border-line bg-surface-strong space-y-6 rounded-2xl border p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Cola operativa</h2>
            <Link href="/coach/athletes" className="text-accent text-xs hover:underline">
              Ver atletas →
            </Link>
          </div>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-foreground/60 text-xs font-semibold tracking-widest uppercase">
                Revisiones pendientes
              </h3>
              <span
                className={`text-xs font-bold ${today.pendingCheckIns.length > 0 ? 'text-warning' : 'text-success'}`}
              >
                {today.pendingCheckIns.length}
              </span>
            </div>
            {today.pendingCheckIns.length === 0 ? (
              <p className="border-line bg-background/30 text-foreground/50 rounded-xl border px-4 py-3 text-xs">
                Todo al día ✓
              </p>
            ) : (
              <div className="space-y-2">
                {today.pendingCheckIns.slice(0, 5).map((item) => (
                  <Link
                    key={item.athleteId}
                    href={`/coach/athletes/${item.athleteId}?tab=Revisiones`}
                    className="border-line bg-background/30 hover:border-accent/35 flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm transition"
                  >
                    <div>
                      <p className="font-medium">{item.fullName}</p>
                      <p className="text-foreground/45 text-xs">
                        {item.phaseLabel} · último {formatDate(item.lastCheckInAt)}
                      </p>
                    </div>
                    <span className="bg-warning/10 text-warning rounded-full px-2.5 py-1 text-xs font-semibold">
                      {item.daysSinceCheckIn ?? 0}d
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-foreground/60 text-xs font-semibold tracking-widest uppercase">
                Mensajes sin leer
              </h3>
              <Link href="/coach/messages" className="text-accent text-xs hover:underline">
                Inbox
              </Link>
            </div>
            {today.unreadMessages.length === 0 ? (
              <p className="border-line bg-background/30 text-foreground/50 rounded-xl border px-4 py-3 text-xs">
                Sin mensajes pendientes
              </p>
            ) : (
              <div className="space-y-2">
                {today.unreadMessages.slice(0, 4).map((item) => (
                  <Link
                    key={item.athleteId}
                    href="/coach/messages"
                    className="border-line bg-background/30 hover:border-accent/35 flex items-start justify-between gap-3 rounded-xl border px-4 py-2.5 transition"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{item.fullName}</p>
                      <p className="text-foreground/45 truncate text-xs">
                        {item.lastMessage ?? 'Nuevo mensaje'}
                      </p>
                    </div>
                    <span className="bg-danger shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold text-white">
                      {item.unreadCount}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {today.riskAthletes.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-danger text-xs font-semibold tracking-widest uppercase">
                  Atletas en riesgo
                </h3>
                <span className="text-danger text-xs font-bold">{today.riskAthletes.length}</span>
              </div>
              <div className="space-y-2">
                {today.riskAthletes.slice(0, 3).map((item) => (
                  <Link
                    key={item.athleteId}
                    href={`/coach/athletes/${item.athleteId}`}
                    className="border-danger/25 bg-danger/5 hover:border-danger/40 block rounded-xl border px-4 py-2.5 transition"
                  >
                    <p className="text-sm font-medium">{item.fullName}</p>
                    <p className="text-foreground/55 text-xs">{item.flags.join(' · ')}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Actividad reciente */}
        <div className="border-line bg-surface-strong space-y-6 rounded-2xl border p-5">
          <h2 className="text-sm font-semibold">Actividad reciente</h2>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-foreground/60 text-xs font-semibold tracking-widest uppercase">
                Últimas sesiones
              </h3>
              <span className="text-foreground/40 text-xs">7 días</span>
            </div>
            {today.recentSessions.length === 0 ? (
              <p className="border-line bg-background/30 text-foreground/50 rounded-xl border px-4 py-3 text-xs">
                Sin sesiones registradas
              </p>
            ) : (
              <div className="space-y-2">
                {today.recentSessions.slice(0, 6).map((item) => (
                  <Link
                    key={item.id}
                    href={`/coach/athletes/${item.athleteId}?tab=Entrenamiento`}
                    className="border-line bg-background/30 hover:border-accent/35 flex items-center justify-between rounded-xl border px-4 py-2.5 transition"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.athleteName}</p>
                      <p className="text-foreground/45 text-xs">
                        {item.sessionName} · {formatDate(item.date)}
                      </p>
                    </div>
                    <span className="text-foreground/40 text-xs">
                      {item.durationMin ? `${item.durationMin}m` : 'manual'}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-3">
              <h3 className="text-foreground/60 text-xs font-semibold tracking-widest uppercase">
                Top consistencia
              </h3>
            </div>
            <div className="space-y-2">
              {today.topAthletes.map((item, i) => (
                <Link
                  key={item.athleteId}
                  href={`/coach/athletes/${item.athleteId}`}
                  className="border-line bg-background/30 hover:border-accent/35 flex items-center gap-3 rounded-xl border px-4 py-2.5 transition"
                >
                  <span className="bg-accent/10 text-accent flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.fullName}</p>
                    <p className="text-foreground/45 text-xs">
                      {item.adherencePct != null
                        ? `${Math.round(item.adherencePct)}% adh.`
                        : 'sin check-in'}{' '}
                      · {item.sessionsLast7d} ses.
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* Aside: acciones rápidas + métricas de foco */}
        <aside className="space-y-4 xl:sticky xl:top-24">
          <div className="border-line bg-surface-strong space-y-3 rounded-2xl border p-4">
            <p className="text-foreground/45 text-xs tracking-widest uppercase">Acciones rápidas</p>
            <Link
              href="/athlete/onboarding"
              className="border-accent/30 text-accent hover:bg-accent/10 flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold transition"
            >
              <span>+ Alta atleta</span>
              <span className="text-foreground/30 text-xs">→</span>
            </Link>
            <Link
              href="/coach/plans/new"
              className="border-line text-foreground/70 hover:text-foreground flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition"
            >
              <span>+ Crear plan</span>
              <span className="text-foreground/30 text-xs">→</span>
            </Link>
            <Link
              href="/coach/messages"
              className="border-line text-foreground/70 hover:text-foreground flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition"
            >
              <span>Abrir mensajes</span>
              {today.stats.unreadMessages > 0 && (
                <span className="bg-danger rounded-full px-2 py-0.5 text-[11px] font-bold text-white">
                  {today.stats.unreadMessages}
                </span>
              )}
            </Link>
            <Link
              href="/coach/athletes"
              className="border-line text-foreground/70 hover:text-foreground flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition"
            >
              <span>Ver todos los atletas</span>
              <span className="text-foreground/30 text-xs">{today.stats.totalAthletes}</span>
            </Link>
          </div>

          <div className="border-line bg-surface-strong space-y-3 rounded-2xl border p-4">
            <p className="text-foreground/45 text-xs tracking-widest uppercase">Foco del día</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-background/50 rounded-xl p-3">
                <p className="text-warning text-2xl font-bold">{today.stats.pendingCheckIns}</p>
                <p className="text-foreground/45 mt-0.5 text-[10px]">Check-ins</p>
              </div>
              <div className="bg-background/50 rounded-xl p-3">
                <p className="text-danger text-2xl font-bold">{today.stats.atRisk}</p>
                <p className="text-foreground/45 mt-0.5 text-[10px]">En riesgo</p>
              </div>
              <div className="bg-background/50 rounded-xl p-3">
                <p className="text-2xl font-bold">{today.stats.unreadNotifications}</p>
                <p className="text-foreground/45 mt-0.5 text-[10px]">Notif.</p>
              </div>
              <div className="bg-background/50 rounded-xl p-3">
                <p className="text-2xl font-bold">{today.stats.sessionsLast7d}</p>
                <p className="text-foreground/45 mt-0.5 text-[10px]">Sesiones 7d</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
