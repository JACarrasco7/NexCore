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
import { useAthleteMe } from '@/lib/use-athlete-me'
import { useSessionLogs } from '@/lib/store'
import type { ExerciseNote, SessionLog } from '@/lib/domain'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExerciseInfo {
  found: boolean
  exerciseName?: string
  category?: string
  description?: string
  muscles: string[]
  musclesSecondary: string[]
  videoUrls: string[]
}

interface ProgressPoint {
  label: string
  maxKg: number
  maxVol: number // kg × reps (mejor serie)
  totalVol: number // suma kcal volumen total sesión
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

// ─── Muscle Tag ───────────────────────────────────────────────────────────────

function MuscleTag({ name, secondary }: { name: string; secondary?: boolean }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-medium ${
        secondary
          ? 'border-line bg-surface-strong text-foreground/60'
          : 'border-accent/30 bg-accent/10 text-accent'
      }`}
    >
      {name}
    </span>
  )
}

// ─── PR Card ─────────────────────────────────────────────────────────────────

function PRCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border-line bg-surface-strong flex flex-col gap-0.5 rounded-3xl border p-4">
      <span className="text-foreground/50 text-xs">{label}</span>
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      {sub && <span className="text-foreground/40 text-xs">{sub}</span>}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExerciseDetailPage() {
  const { name: rawName } = useParams<{ name: string }>()
  const router = useRouter()
  const exerciseName = decodeURIComponent(rawName ?? '').trim()

  const { athlete, loading: loadingAthlete } = useAthleteMe()
  const { logs, loading: loadingLogs } = useSessionLogs(athlete?.id)

  // WGER exercise info
  const [info, setInfo] = useState<ExerciseInfo | null>(null)
  const [loadingInfo, setLoadingInfo] = useState(true)

  // Notes
  const [notes, setNotes] = useState<ExerciseNote[]>([])
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  // Video player
  const [videoIdx, setVideoIdx] = useState(0)

  // ── Load WGER info ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!exerciseName) return
    setLoadingInfo(true)
    fetch(`/api/wger/exercise-info?name=${encodeURIComponent(exerciseName)}`)
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => setInfo(null))
      .finally(() => setLoadingInfo(false))
  }, [exerciseName])

  // ── Load notes ──────────────────────────────────────────────────────────
  const loadNotes = useCallback(async () => {
    if (!athlete?.id) return
    const res = await fetch(
      `/api/exercise-notes?athleteId=${athlete.id}&exercise=${encodeURIComponent(exerciseName)}`
    )
    if (res.ok) setNotes(await res.json())
  }, [athlete?.id, exerciseName])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  // ── Derive progression data from session logs ────────────────────────────
  const { progressPoints, pr } = deriveProgress(logs, exerciseName)

  // ── Save note ────────────────────────────────────────────────────────────
  async function handleSaveNote() {
    if (!athlete?.id || !noteText.trim()) return
    setSavingNote(true)
    await fetch('/api/exercise-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        athleteId: athlete.id,
        exerciseName,
        content: noteText.trim(),
      }),
    })
    setNoteText('')
    await loadNotes()
    setSavingNote(false)
  }

  // ── YouTube fallback search URL ──────────────────────────────────────────
  const ytSearch = `https://www.youtube.com/results?search_query=${encodeURIComponent(exerciseName + ' exercise tutorial form')}`

  const videos = info?.videoUrls ?? []
  const currentVideo = videos[videoIdx]

  if (loadingAthlete || loadingLogs) {
    return (
      <main className="mx-auto flex w-full max-w-370 flex-1 flex-col gap-6 px-6 py-8 md:px-10 lg:px-12">
        <div className="bg-surface-strong h-8 w-48 animate-pulse rounded-2xl" />
        <div className="bg-surface-strong h-64 animate-pulse rounded-4xl" />
        <div className="bg-surface-strong h-40 animate-pulse rounded-4xl" />
      </main>
    )
  }

  return (
    <main className="mx-auto flex w-full max-w-370 flex-1 flex-col gap-8 px-6 py-8 md:px-10 lg:px-12">
      {/* Back + title */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => router.back()}
          className="border-line text-foreground/60 hover:text-foreground mt-0.5 shrink-0 rounded-full border px-3 py-1.5 text-xs transition"
        >
          ← Volver
        </button>
        <div>
          <p className="text-foreground/40 text-xs font-medium tracking-widest uppercase">
            {info?.category ?? 'Ejercicio'}
          </p>
          <h1 className="text-2xl leading-tight font-bold">{exerciseName}</h1>
        </div>
      </div>

      {/* Main 2-col layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-6">
          {/* Progression chart */}
          <section className="border-line bg-surface rounded-4xl border p-6 shadow-[0_16px_48px_rgba(0,0,0,0.06)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Progresión de carga</h2>
                <p className="text-foreground/50 text-xs">Máximo por sesión</p>
              </div>
              {pr && (
                <span className="border-success/30 bg-success/10 text-success rounded-full border px-3 py-1 text-xs font-semibold">
                  PR {pr.maxKg} kg
                </span>
              )}
            </div>

            {progressPoints.length < 2 ? (
              <div className="border-line bg-surface-strong flex h-40 items-center justify-center rounded-3xl border border-dashed">
                <p className="text-foreground/40 text-sm">
                  {progressPoints.length === 0
                    ? 'Sin registros todavía — empieza a entrenar para ver tu progresión'
                    : 'Registra al menos 2 sesiones para ver la gráfica'}
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart
                  data={progressPoints}
                  margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
                >
                  <defs>
                    <linearGradient id="gradKg" x1="0" y1="0" x2="0" y2="1">
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
                    formatter={(v) => [`${v} kg`, 'Máx carga']}
                  />
                  <Area
                    type="monotone"
                    dataKey="maxKg"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    fill="url(#gradKg)"
                    dot={{ r: 3, fill: 'var(--accent)' }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </section>

          {/* Personal records */}
          {pr && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <PRCard label="Máximo peso" value={`${pr.maxKg} kg`} sub={formatDate(pr.maxKgDate)} />
              <PRCard label="Mejor volumen" value={`${pr.maxVol}`} sub="kg × reps (serie)" />
              <PRCard label="Sesiones" value={String(pr.totalSessions)} sub="registradas" />
              <PRCard
                label="Última vez"
                value={formatDate(pr.lastDate)}
                sub={pr.lastDate ? `hace ${daysSince(pr.lastDate)}d` : ''}
              />
            </div>
          )}

          {/* Historial de series recientes */}
          {progressPoints.length > 0 && (
            <section className="border-line bg-surface rounded-4xl border p-6 shadow-[0_16px_48px_rgba(0,0,0,0.06)]">
              <h2 className="mb-4 text-lg font-semibold">Últimas sesiones</h2>
              <div className="space-y-3">
                {getRecentSets(logs, exerciseName)
                  .slice(0, 5)
                  .map((session) => (
                    <div
                      key={session.sessionLogId}
                      className="border-line bg-surface-strong rounded-3xl border p-4"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-semibold">{session.sessionName}</span>
                        <span className="text-foreground/40 text-xs">
                          {formatDate(session.date)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {session.sets.map((s, i) => (
                          <span
                            key={i}
                            className="border-line bg-surface rounded-2xl border px-3 py-1 font-mono text-xs"
                          >
                            {s.loadKg}kg × {s.reps}
                            {s.rir !== undefined ? ` RIR${s.rir}` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          )}

          {/* Notes / comments */}
          <section className="border-line bg-surface rounded-4xl border p-6 shadow-[0_16px_48px_rgba(0,0,0,0.06)]">
            <h2 className="mb-1 text-lg font-semibold">Notas del ejercicio</h2>
            <p className="text-foreground/50 mb-4 text-xs">
              Apunta sensaciones, ajustes de agarre, errores técnicos o cualquier cue personal.
            </p>

            <div className="space-y-3">
              <textarea
                rows={3}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Ej: «Con agarre neutro siento más el pectoral. La semana pasada me costó la última serie...»"
                className="border-line bg-surface-strong focus:border-accent w-full resize-none rounded-2xl border px-4 py-3 text-sm transition outline-none"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleSaveNote}
                  disabled={savingNote || !noteText.trim()}
                  className="bg-accent hover:bg-accent-strong rounded-full px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-40"
                >
                  {savingNote ? 'Guardando…' : 'Guardar nota'}
                </button>
              </div>
            </div>

            {notes.length > 0 && (
              <div className="border-line mt-5 space-y-3 border-t pt-4">
                {notes.map((n) => (
                  <div key={n.id} className="border-line bg-surface-strong rounded-3xl border p-4">
                    <p className="text-sm leading-relaxed">{n.content}</p>
                    <p className="text-foreground/40 mt-2 text-xs">{formatDate(n.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ── RIGHT COLUMN ────────────────────────────────────────────── */}
        <div className="flex flex-col gap-6">
          {/* Video demo */}
          <section className="border-line bg-surface rounded-4xl border p-6 shadow-[0_16px_48px_rgba(0,0,0,0.06)]">
            <h2 className="mb-3 text-lg font-semibold">Demo técnico</h2>

            {loadingInfo ? (
              <div className="bg-surface-strong h-48 animate-pulse rounded-3xl" />
            ) : currentVideo ? (
              <div className="border-line overflow-hidden rounded-3xl border bg-black">
                <video src={currentVideo} controls loop playsInline className="w-full" poster="" />
                {videos.length > 1 && (
                  <div className="bg-surface-strong flex gap-2 p-2">
                    {videos.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setVideoIdx(i)}
                        className={`h-2 flex-1 rounded-full transition ${
                          i === videoIdx ? 'bg-accent' : 'bg-line'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="border-line bg-surface-strong flex flex-col items-center gap-3 rounded-3xl border border-dashed py-8 text-center">
                <span className="text-3xl">🎬</span>
                <p className="text-foreground/50 text-sm">
                  No hay vídeo disponible en la base de datos
                </p>
                <a
                  href={ytSearch}
                  target="_blank"
                  rel="noreferrer"
                  className="border-accent/30 text-accent hover:bg-accent/10 rounded-full border px-4 py-1.5 text-xs font-medium transition"
                >
                  Buscar en YouTube →
                </a>
              </div>
            )}
          </section>

          {/* Muscles */}
          <section className="border-line bg-surface rounded-4xl border p-6 shadow-[0_16px_48px_rgba(0,0,0,0.06)]">
            <h2 className="mb-3 text-lg font-semibold">Músculos</h2>

            {loadingInfo ? (
              <div className="space-y-2">
                <div className="bg-surface-strong h-6 w-32 animate-pulse rounded-full" />
                <div className="bg-surface-strong h-6 w-24 animate-pulse rounded-full" />
              </div>
            ) : (
              <div className="space-y-3">
                {(info?.muscles?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-foreground/40 mb-1.5 text-xs font-semibold tracking-widest uppercase">
                      Principal
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
                    <p className="text-foreground/40 mb-1.5 text-xs font-semibold tracking-widest uppercase">
                      Secundario
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {info!.musclesSecondary.map((m) => (
                        <MuscleTag key={m} name={m} secondary />
                      ))}
                    </div>
                  </div>
                )}
                {!info?.found && !loadingInfo && (
                  <p className="text-foreground/40 text-sm">
                    No se encontraron datos en la base de datos WGER para este ejercicio.
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Description */}
          {info?.description && (
            <section className="border-line bg-surface rounded-4xl border p-6 shadow-[0_16px_48px_rgba(0,0,0,0.06)]">
              <h2 className="mb-3 text-lg font-semibold">Descripción</h2>
              <p className="text-foreground/70 text-sm leading-relaxed">{info.description}</p>
            </section>
          )}

          {/* CTA: go to training log */}
          <Link
            href={`/athlete/training-log`}
            className="bg-accent hover:bg-accent-strong flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white transition"
          >
            Ir a registrar sesión →
          </Link>
        </div>
      </div>
    </main>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveProgress(
  logs: SessionLog[],
  exerciseName: string
): { progressPoints: ProgressPoint[]; pr: PersonalRecord | null } {
  const nameLow = exerciseName.toLowerCase()

  // Agrupar por fecha (día) — tomar el máximo de esa sesión
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
    if (!byDay[day]) {
      byDay[day] = { maxKg: 0, maxVol: 0, totalVol: 0, sets: 0, date: log.date }
    }

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
    .slice(-12) // últimas 12 sesiones

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

  // PR global
  const allDays = Object.values(byDay)
  const maxKgEntry = allDays.reduce((a, b) => (b.maxKg > a.maxKg ? b : a))
  const maxVolEntry = allDays.reduce((a, b) => (b.maxVol > a.maxVol ? b : a))
  const lastEntry = Object.entries(byDay).sort(([a], [b]) => b.localeCompare(a))[0]

  const pr: PersonalRecord = {
    maxKg: maxKgEntry.maxKg,
    maxKgDate: maxKgEntry.date,
    maxVol: Math.round(maxVolEntry.maxVol),
    maxVolDate: maxVolEntry.date,
    totalSessions: Object.keys(byDay).length,
    lastDate: lastEntry ? lastEntry[1].date : '',
  }

  return { progressPoints, pr }
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
    .slice(0, 5)
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
