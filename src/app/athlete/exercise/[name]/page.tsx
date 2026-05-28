'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAthleteMe } from '@/lib/use-athlete-me'
import { useSessionLogs } from '@/lib/store'
import { FormField } from '@/components/ui/form-field'
import { Skeleton } from '@/components/ui/skeleton'
import type { ExerciseNote, SessionLog } from '@/lib/domain'

interface ExerciseInfo {
  found: boolean
  exerciseName?: string
  category?: string
  description?: string
  muscles: string[]
  musclesSecondary: string[]
  videoUrls: string[]
  imageUrls?: string[]
  mainImageUrl?: string
  equipment?: string
  difficulty?: string
}
interface ProgressPoint {
  label: string
  maxKg: number
  maxVol: number
  totalVol: number
  sets: number
}
interface PersonalRecord {
  maxKg: number
  maxKgDate: string
  maxVol: number
  maxVolDate: string
  totalSessions: number
  lastDate: string
}

const noteFormSchema = z.object({ content: z.string().min(1, 'Escribe una nota').max(2000) })
type NoteFormValues = z.infer<typeof noteFormSchema>

// ─── Sub-components ───────────────────────────────────────────────────────────

function MuscleTag({ name, secondary }: { name: string; secondary?: boolean }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-medium ${secondary ? 'border-line bg-surface-strong text-foreground/60' : 'border-accent/30 bg-accent/10 text-accent'}`}
    >
      {name}
    </span>
  )
}

function PRCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border-line bg-surface-strong flex flex-col gap-0.5 rounded-3xl border p-4">
      <span className="text-foreground/50 text-xs">{label}</span>
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      {sub && <span className="text-foreground/40 text-xs">{sub}</span>}
    </div>
  )
}

function Collapse({
  title,
  subtitle,
  defaultOpen,
  badge,
  children,
}: {
  title: string
  subtitle?: string
  defaultOpen?: boolean
  badge?: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  return (
    <section className="border-line bg-surface overflow-hidden rounded-4xl border">
      <button
        onClick={() => setOpen(!open)}
        className="hover:bg-surface-strong flex w-full items-center justify-between gap-4 p-5 text-left transition"
      >
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{title}</h2>
            {badge && (
              <span className="bg-accent/10 text-accent rounded-full px-2 py-0.5 text-[10px] font-semibold">
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-foreground/50 mt-0.5 text-xs">{subtitle}</p>}
        </div>
        <span
          className={`text-foreground/40 text-sm transition-transform ${open ? 'rotate-180' : ''}`}
        >
          ▼
        </span>
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5">{children}</div>
        </div>
      </div>
    </section>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExerciseDetailPage() {
  const { name: rawName } = useParams<{ name: string }>()
  const router = useRouter()
  const exerciseName = decodeURIComponent(rawName ?? '').trim()

  const { athlete, loading: loadingAthlete } = useAthleteMe()
  const { logs, loading: loadingLogs } = useSessionLogs(athlete?.id)
  const [info, setInfo] = useState<ExerciseInfo | null>(null)
  const [loadingInfo, setLoadingInfo] = useState(true)
  const [videoIdx, setVideoIdx] = useState(0)
  const [noteSaving, setNoteSaving] = useState(false)
  const [coachNotes, setCoachNotes] = useState<ExerciseNote[]>([])
  const [athleteNotes, setAthleteNotes] = useState<ExerciseNote[]>([])
  const [noteTab, setNoteTab] = useState<'mine' | 'coach'>('mine')

  const noteMethods = useForm<NoteFormValues>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: { content: '' },
  })

  useEffect(() => {
    if (!exerciseName) return
    setLoadingInfo(true)
    fetch(`/api/wger/exercise-info?name=${encodeURIComponent(exerciseName)}`)
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => setInfo(null))
      .finally(() => setLoadingInfo(false))
  }, [exerciseName])

  const loadNotes = useCallback(async () => {
    if (!athlete?.id) return
    const res = await fetch(
      `/api/exercise-notes?athleteId=${athlete.id}&exercise=${encodeURIComponent(exerciseName)}`
    )
    if (res.ok) {
      const all: ExerciseNote[] = await res.json()
      setAthleteNotes(all.filter((n) => (n as any).author !== 'COACH'))
      setCoachNotes(all.filter((n) => (n as any).author === 'COACH'))
    }
  }, [athlete?.id, exerciseName])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  async function handleSaveNote(data: NoteFormValues) {
    if (!athlete?.id) return
    setNoteSaving(true)
    await fetch('/api/exercise-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        athleteId: athlete.id,
        exerciseName,
        content: data.content.trim(),
        author: 'ATHLETE',
      }),
    })
    noteMethods.reset({ content: '' })
    await loadNotes()
    setNoteSaving(false)
  }

  const { progressPoints, pr } = deriveProgress(logs, exerciseName)
  const videos = info?.videoUrls ?? []
  const currentVideo = videos[videoIdx]
  const ytSearch = `https://www.youtube.com/results?search_query=${encodeURIComponent(exerciseName + ' exercise tutorial form')}`

  if (loadingAthlete || loadingLogs) {
    return (
      <main className="mx-auto flex w-full max-w-370 flex-1 flex-col gap-6 px-6 py-8 md:px-10 lg:px-12">
        <Skeleton className="h-8 w-48 rounded-2xl" />
        <Skeleton className="h-64 rounded-4xl" />
      </main>
    )
  }

  return (
    <main className="mx-auto flex w-full max-w-370 flex-1 flex-col gap-5 px-6 py-8 md:px-10 lg:px-12">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => router.back()}
          className="border-line text-foreground/60 hover:text-foreground mt-0.5 shrink-0 rounded-full border px-3 py-1.5 text-xs transition"
        >
          ←
        </button>
        <div className="min-w-0">
          <p className="text-foreground/40 text-xs font-medium tracking-widest uppercase">
            {info?.category ?? 'Ejercicio'}
          </p>
          <h1 className="truncate text-2xl leading-tight font-bold">{exerciseName}</h1>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {(info?.muscles ?? []).map((m) => (
              <MuscleTag key={m} name={m} />
            ))}
            {(info?.musclesSecondary ?? []).slice(0, 2).map((m) => (
              <MuscleTag key={m} name={m} secondary />
            ))}
            {info?.equipment && (
              <span className="bg-surface-strong text-foreground/50 border-line rounded-full border px-2.5 py-0.5 text-xs">
                {info.equipment}
              </span>
            )}
            {info?.difficulty && (
              <span className="bg-surface-strong text-foreground/50 border-line rounded-full border px-2.5 py-0.5 text-xs capitalize">
                {info.difficulty}
              </span>
            )}
          </div>
        </div>
        <Link
          href="/athlete/training-log"
          className="bg-accent hover:bg-accent-strong ml-auto shrink-0 rounded-full px-4 py-2 text-xs font-semibold text-white transition"
        >
          Registrar sesión →
        </Link>
      </div>

      {/* Always visible: Progresión + Demo lado a lado */}
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* Progresión */}
        <section className="border-line bg-surface rounded-4xl border p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Progresión de carga</h2>
              <p className="text-foreground/50 text-xs">Máximo por sesión (kg)</p>
            </div>
            {pr && (
              <span className="border-success/30 bg-success/10 text-success rounded-full border px-3 py-1 text-xs font-semibold">
                PR {pr.maxKg} kg
              </span>
            )}
          </div>
          {progressPoints.length < 2 ? (
            <div className="border-line bg-surface-strong flex h-32 items-center justify-center rounded-3xl border border-dashed">
              <p className="text-foreground/40 text-sm">
                {progressPoints.length === 0
                  ? 'Sin datos aún — registra sesiones para ver tu progresión'
                  : 'Necesitas al menos 2 sesiones'}
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={progressPoints} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gradKg2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: 'var(--foreground)', opacity: 0.4 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--foreground)', opacity: 0.4 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="maxKg"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  fill="url(#gradKg2)"
                  dot={{ r: 3, fill: 'var(--accent)' }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
          {pr && (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <PRCard label="Máx peso" value={`${pr.maxKg}`} sub="kg" />
              <PRCard label="Mejor vol" value={`${pr.maxVol}`} sub="kg×rep" />
              <PRCard label="Sesiones" value={String(pr.totalSessions)} sub="total" />
              <PRCard
                label="Última"
                value={formatDate(pr.lastDate)}
                sub={pr.lastDate ? `hace ${daysSince(pr.lastDate)}d` : '—'}
              />
            </div>
          )}
        </section>

        {/* Demo + imagen */}
        <div className="space-y-5">
          <section className="border-line bg-surface rounded-4xl border p-5">
            <h2 className="mb-3 text-sm font-semibold">Demo técnico</h2>
            {loadingInfo ? (
              <Skeleton className="h-40 rounded-3xl" />
            ) : currentVideo ? (
              <div className="border-line overflow-hidden rounded-3xl border bg-black">
                <video src={currentVideo} controls loop playsInline className="w-full" />
                {videos.length > 1 && (
                  <div className="bg-surface-strong flex gap-2 p-2">
                    {videos.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setVideoIdx(i)}
                        className={`h-1.5 flex-1 rounded-full transition ${i === videoIdx ? 'bg-accent' : 'bg-line'}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="border-line bg-surface-strong flex flex-col items-center gap-2 rounded-3xl border border-dashed py-8">
                <span className="text-2xl">🎬</span>
                <p className="text-foreground/50 text-center text-xs">
                  Sin vídeo en la base de datos
                </p>
                <a
                  href={ytSearch}
                  target="_blank"
                  rel="noreferrer"
                  className="border-accent/30 text-accent hover:bg-accent/10 rounded-full border px-3 py-1 text-[11px] font-medium transition"
                >
                  YouTube →
                </a>
              </div>
            )}
          </section>
          {info?.mainImageUrl && (
            <section className="border-line bg-surface rounded-4xl border p-5">
              <img
                src={info.mainImageUrl}
                alt={exerciseName}
                className="border-line w-full rounded-3xl border bg-black object-contain"
                style={{ maxHeight: 180 }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            </section>
          )}
        </div>
      </div>

      {/* Collapsible: Últimas sesiones */}
      {progressPoints.length > 0 && (
        <Collapse
          title="Últimas sesiones"
          subtitle={`${getRecentSets(logs, exerciseName).length} registros recientes`}
        >
          <div className="space-y-2">
            {getRecentSets(logs, exerciseName)
              .slice(0, 8)
              .map((session) => (
                <div
                  key={session.sessionLogId}
                  className="border-line bg-surface-strong flex items-center gap-3 rounded-2xl border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold">{session.sessionName}</p>
                    <p className="text-foreground/40 text-[10px]">{formatDate(session.date)}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {session.sets.map((s, i) => (
                      <span
                        key={i}
                        className="border-line bg-surface rounded-xl border px-2 py-0.5 font-mono text-[11px]"
                      >
                        {s.loadKg}kg × {s.reps}
                        {s.rir !== undefined ? ` @${s.rir}` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </Collapse>
      )}

      {/* Collapsible: Notas */}
      <Collapse
        title="Notas"
        subtitle="Tus notas y las de tu coach"
        badge={coachNotes.length > 0 ? `${coachNotes.length} coach` : undefined}
        defaultOpen={coachNotes.length > 0}
      >
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setNoteTab('mine')}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${noteTab === 'mine' ? 'bg-accent/10 text-accent' : 'text-foreground/50 hover:text-foreground'}`}
          >
            Mis notas
          </button>
          <button
            onClick={() => setNoteTab('coach')}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${noteTab === 'coach' ? 'bg-accent/10 text-accent' : 'text-foreground/50 hover:text-foreground'}`}
          >
            Notas del coach {coachNotes.length > 0 && `(${coachNotes.length})`}
          </button>
        </div>

        {noteTab === 'mine' ? (
          <div className="space-y-3">
            <FormProvider {...noteMethods}>
              <form onSubmit={noteMethods.handleSubmit(handleSaveNote)} className="flex gap-2">
                <FormField
                  name="content"
                  type="textarea"
                  placeholder="Apunta sensaciones, ajustes, cues..."
                  className="flex-1"
                />
                <button
                  type="submit"
                  disabled={noteSaving}
                  className="bg-accent hover:bg-accent-strong shrink-0 self-end rounded-full px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-40"
                >
                  {noteSaving ? '...' : 'Guardar'}
                </button>
              </form>
            </FormProvider>
            {athleteNotes.map((n) => (
              <div key={n.id} className="border-line bg-surface-strong rounded-2xl border p-3">
                <p className="text-sm">{n.content}</p>
                <p className="text-foreground/40 mt-1.5 text-[10px]">{formatDate(n.createdAt)}</p>
              </div>
            ))}
          </div>
        ) : coachNotes.length === 0 ? (
          <div className="border-line bg-surface-strong flex flex-col items-center gap-2 rounded-3xl border border-dashed py-8">
            <span className="text-xl">📝</span>
            <p className="text-foreground/40 text-xs">
              Tu coach aún no ha dejado notas para este ejercicio
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {coachNotes.map((n) => (
              <div key={n.id} className="border-accent/20 bg-accent/5 rounded-2xl border p-3">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="border-accent/30 bg-accent/10 text-accent rounded-full border px-2 py-0.5 text-[10px] font-semibold">
                    Coach
                  </span>
                  <span className="text-foreground/40 text-[10px]">{formatDate(n.createdAt)}</span>
                </div>
                <p className="text-sm">{n.content}</p>
              </div>
            ))}
          </div>
        )}
      </Collapse>

      {/* Collapsible: Descripción */}
      {(info?.description || (info?.muscles?.length ?? 0) > 0) && (
        <Collapse
          title="Descripción y músculos"
          subtitle={info?.equipment ? `Equipo: ${info.equipment}` : undefined}
        >
          <div className="space-y-4">
            {info?.description && (
              <p className="text-foreground/70 text-sm leading-relaxed">{info.description}</p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {(info?.muscles?.length ?? 0) > 0 && (
                <div>
                  <p className="text-foreground/40 mb-1.5 text-[10px] font-semibold tracking-widest uppercase">
                    Principales
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {info!.muscles.map((m) => (
                      <MuscleTag key={m} name={m} />
                    ))}
                  </div>
                </div>
              )}
              {(info?.musclesSecondary?.length ?? 0) > 0 && (
                <div>
                  <p className="text-foreground/40 mb-1.5 text-[10px] font-semibold tracking-widest uppercase">
                    Secundarios
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {info!.musclesSecondary.map((m) => (
                      <MuscleTag key={m} name={m} secondary />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Collapse>
      )}
    </main>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveProgress(
  logs: SessionLog[],
  exerciseName: string
): { progressPoints: ProgressPoint[]; pr: PersonalRecord | null } {
  const nameLow = exerciseName.toLowerCase()
  const byDay: Record<
    string,
    { maxKg: number; maxVol: number; totalVol: number; sets: number; date: string }
  > = {}
  for (const log of logs) {
    const relevant = log.sets.filter(
      (s) =>
        s.exercise.toLowerCase().includes(nameLow) ||
        nameLow.includes(s.exercise.toLowerCase().split(' ')[0])
    )
    if (relevant.length === 0) continue
    const day = log.date.slice(0, 10)
    if (!byDay[day]) byDay[day] = { maxKg: 0, maxVol: 0, totalVol: 0, sets: 0, date: log.date }
    for (const s of relevant) {
      const vol = s.loadKg * s.reps
      if (s.loadKg > byDay[day].maxKg) byDay[day].maxKg = s.loadKg
      if (vol > byDay[day].maxVol) byDay[day].maxVol = vol
      byDay[day].totalVol += vol
      byDay[day].sets++
    }
  }
  const sorted = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
  if (sorted.length === 0) return { progressPoints: [], pr: null }
  const progressPoints: ProgressPoint[] = sorted.map(([day, v]) => ({
    label: new Date(day + 'T12:00:00').toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
    }),
    maxKg: v.maxKg,
    maxVol: Math.round(v.maxVol),
    totalVol: Math.round(v.totalVol),
    sets: v.sets,
  }))
  const allDays = Object.values(byDay)
  const maxKgEntry = allDays.reduce((a, b) => (b.maxKg > a.maxKg ? b : a))
  const maxVolEntry = allDays.reduce((a, b) => (b.maxVol > a.maxVol ? b : a))
  const lastEntry = Object.entries(byDay).sort(([a], [b]) => b.localeCompare(a))[0]
  return {
    progressPoints,
    pr: {
      maxKg: maxKgEntry.maxKg,
      maxKgDate: maxKgEntry.date,
      maxVol: Math.round(maxVolEntry.maxVol),
      maxVolDate: maxVolEntry.date,
      totalSessions: Object.keys(byDay).length,
      lastDate: lastEntry ? lastEntry[1].date : '',
    },
  }
}

function getRecentSets(logs: SessionLog[], exerciseName: string) {
  const nameLow = exerciseName.toLowerCase()
  return logs
    .filter((l) =>
      l.sets.some(
        (s) =>
          s.exercise.toLowerCase().includes(nameLow) ||
          nameLow.includes(s.exercise.toLowerCase().split(' ')[0])
      )
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8)
    .map((l) => ({
      sessionLogId: l.id,
      sessionName: l.sessionName,
      date: l.date,
      sets: l.sets
        .filter(
          (s) =>
            s.exercise.toLowerCase().includes(nameLow) ||
            nameLow.includes(s.exercise.toLowerCase().split(' ')[0])
        )
        .sort((a, b) => a.setNumber - b.setNumber),
    }))
}

function formatDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
function daysSince(iso: string) {
  if (!iso) return 0
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}
