import Link from "next/link";
import { redirect } from "next/navigation";
import { StatCard } from "@/components/stat-card";
import { auth } from "@/auth";
import { getCoachToday } from "@/lib/coach-today";

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) return "Sin registro";
  return new Date(value).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export default async function CoachPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const today = await getCoachToday(session.user.id);
  const coachStats = [
    { label: "Atletas activos", value: String(today.stats.totalAthletes), detail: "en seguimiento", tone: "default" as const },
    { label: "Pendientes", value: String(today.stats.pendingCheckIns), detail: "sin check-in reciente", tone: today.stats.pendingCheckIns > 0 ? ("warning" as const) : ("success" as const) },
    { label: "Alertas", value: String(today.stats.atRisk), detail: "adherencia o sueño bajos", tone: today.stats.atRisk > 0 ? ("danger" as const) : ("success" as const) },
    { label: "Adherencia media", value: today.stats.avgAdherence !== null ? `${today.stats.avgAdherence}%` : "—", detail: `${today.stats.sessionsLast7d} sesiones en 7 días`, tone: today.stats.avgAdherence !== null && today.stats.avgAdherence >= 80 ? ("success" as const) : ("warning" as const) },
  ];

  return (
    <div className="mx-auto w-full max-w-[1480px] px-6 py-6 md:px-10 lg:px-12 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-foreground/40">Dashboard coach</p>
          <h1 className="mt-1 text-2xl font-bold">{today.coach.displayName}</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-foreground/40">
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
        <div className="rounded-2xl border border-line bg-surface-strong p-5 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Cola operativa</h2>
            <Link href="/coach/athletes" className="text-xs text-accent hover:underline">Ver atletas →</Link>
          </div>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-foreground/60 uppercase tracking-widest">Check-ins pendientes</h3>
              <span className={`text-xs font-bold ${today.pendingCheckIns.length > 0 ? "text-warning" : "text-success"}`}>{today.pendingCheckIns.length}</span>
            </div>
            {today.pendingCheckIns.length === 0 ? (
              <p className="rounded-xl border border-line bg-background/30 px-4 py-3 text-xs text-foreground/50">Todo al día ✓</p>
            ) : (
              <div className="space-y-2">
                {today.pendingCheckIns.slice(0, 5).map((item) => (
                  <Link key={item.athleteId} href={`/coach/athletes/${item.athleteId}?tab=Check-ins`}
                    className="flex items-center justify-between rounded-xl border border-line bg-background/30 px-4 py-2.5 text-sm transition hover:border-accent/35">
                    <div>
                      <p className="font-medium">{item.fullName}</p>
                      <p className="text-xs text-foreground/45">{item.phaseLabel} · último {formatDate(item.lastCheckInAt)}</p>
                    </div>
                    <span className="rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning">{item.daysSinceCheckIn ?? 0}d</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-foreground/60 uppercase tracking-widest">Mensajes sin leer</h3>
              <Link href="/coach/messages" className="text-xs text-accent hover:underline">Inbox</Link>
            </div>
            {today.unreadMessages.length === 0 ? (
              <p className="rounded-xl border border-line bg-background/30 px-4 py-3 text-xs text-foreground/50">Sin mensajes pendientes</p>
            ) : (
              <div className="space-y-2">
                {today.unreadMessages.slice(0, 4).map((item) => (
                  <Link key={item.athleteId} href="/coach/messages"
                    className="flex items-start justify-between gap-3 rounded-xl border border-line bg-background/30 px-4 py-2.5 transition hover:border-accent/35">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{item.fullName}</p>
                      <p className="text-xs text-foreground/45 truncate">{item.lastMessage ?? "Nuevo mensaje"}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-danger px-2 py-0.5 text-[11px] font-bold text-white">{item.unreadCount}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {today.riskAthletes.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-semibold text-danger uppercase tracking-widest">Atletas en riesgo</h3>
                <span className="text-xs font-bold text-danger">{today.riskAthletes.length}</span>
              </div>
              <div className="space-y-2">
                {today.riskAthletes.slice(0, 3).map((item) => (
                  <Link key={item.athleteId} href={`/coach/athletes/${item.athleteId}`}
                    className="block rounded-xl border border-danger/25 bg-danger/5 px-4 py-2.5 transition hover:border-danger/40">
                    <p className="text-sm font-medium">{item.fullName}</p>
                    <p className="text-xs text-foreground/55">{item.flags.join(" · ")}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Actividad reciente */}
        <div className="rounded-2xl border border-line bg-surface-strong p-5 space-y-6">
          <h2 className="text-sm font-semibold">Actividad reciente</h2>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-foreground/60 uppercase tracking-widest">Últimas sesiones</h3>
              <span className="text-xs text-foreground/40">7 días</span>
            </div>
            {today.recentSessions.length === 0 ? (
              <p className="rounded-xl border border-line bg-background/30 px-4 py-3 text-xs text-foreground/50">Sin sesiones registradas</p>
            ) : (
              <div className="space-y-2">
                {today.recentSessions.slice(0, 6).map((item) => (
                  <Link key={item.id} href={`/coach/athletes/${item.athleteId}?tab=Entrenamiento`}
                    className="flex items-center justify-between rounded-xl border border-line bg-background/30 px-4 py-2.5 transition hover:border-accent/35">
                    <div>
                      <p className="text-sm font-medium">{item.athleteName}</p>
                      <p className="text-xs text-foreground/45">{item.sessionName} · {formatDate(item.date)}</p>
                    </div>
                    <span className="text-xs text-foreground/40">{item.durationMin ? `${item.durationMin}m` : "manual"}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-3">
              <h3 className="text-xs font-semibold text-foreground/60 uppercase tracking-widest">Top consistencia</h3>
            </div>
            <div className="space-y-2">
              {today.topAthletes.map((item, i) => (
                <Link key={item.athleteId} href={`/coach/athletes/${item.athleteId}`}
                  className="flex items-center gap-3 rounded-xl border border-line bg-background/30 px-4 py-2.5 transition hover:border-accent/35">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.fullName}</p>
                    <p className="text-xs text-foreground/45">
                      {item.adherencePct != null ? `${Math.round(item.adherencePct)}% adh.` : "sin check-in"} · {item.sessionsLast7d} ses.
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* Aside: acciones rápidas + métricas de foco */}
        <aside className="space-y-4 xl:sticky xl:top-24">
          <div className="rounded-2xl border border-line bg-surface-strong p-4 space-y-3">
            <p className="text-xs uppercase tracking-widest text-foreground/45">Acciones rápidas</p>
            <Link href="/athlete/onboarding"
              className="flex items-center justify-between rounded-xl border border-accent/30 px-4 py-3 text-sm font-semibold text-accent hover:bg-accent/10 transition">
              <span>+ Alta atleta</span>
              <span className="text-foreground/30 text-xs">→</span>
            </Link>
            <Link href="/coach/plans/new"
              className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm text-foreground/70 hover:text-foreground transition">
              <span>+ Crear plan</span>
              <span className="text-foreground/30 text-xs">→</span>
            </Link>
            <Link href="/coach/messages"
              className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm text-foreground/70 hover:text-foreground transition">
              <span>Abrir mensajes</span>
              {today.stats.unreadMessages > 0 && (
                <span className="rounded-full bg-danger px-2 py-0.5 text-[11px] font-bold text-white">{today.stats.unreadMessages}</span>
              )}
            </Link>
            <Link href="/coach/athletes"
              className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm text-foreground/70 hover:text-foreground transition">
              <span>Ver todos los atletas</span>
              <span className="text-foreground/30 text-xs">{today.stats.totalAthletes}</span>
            </Link>
          </div>

          <div className="rounded-2xl border border-line bg-surface-strong p-4 space-y-3">
            <p className="text-xs uppercase tracking-widest text-foreground/45">Foco del día</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-background/50 p-3">
                <p className="text-2xl font-bold text-warning">{today.stats.pendingCheckIns}</p>
                <p className="text-[10px] text-foreground/45 mt-0.5">Check-ins</p>
              </div>
              <div className="rounded-xl bg-background/50 p-3">
                <p className="text-2xl font-bold text-danger">{today.stats.atRisk}</p>
                <p className="text-[10px] text-foreground/45 mt-0.5">En riesgo</p>
              </div>
              <div className="rounded-xl bg-background/50 p-3">
                <p className="text-2xl font-bold">{today.stats.unreadNotifications}</p>
                <p className="text-[10px] text-foreground/45 mt-0.5">Notif.</p>
              </div>
              <div className="rounded-xl bg-background/50 p-3">
                <p className="text-2xl font-bold">{today.stats.sessionsLast7d}</p>
                <p className="text-[10px] text-foreground/45 mt-0.5">Sesiones 7d</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
