'use client'

import Link from 'next/link'
import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { PageShell } from '@/components/layout'
import { SectionIntro } from '@/components/section-intro'
import {
  getNutritionCsvHeaders,
  parseNutritionCsvWithMap,
  suggestNutritionColumnMap,
  type CsvColumnMap,
} from '@/lib/food-csv'
import { useAthletes } from '@/lib/store'
import { useCoachMe } from '@/lib/use-coach-me'

const DEFAULT_INPUT = `meal,time,food,quantity,unit,kcal,protein,carbs,fat
Desayuno,08:00,Avena,80,g,311,13.5,53.0,5.5
Desayuno,08:00,Yogur griego 0%,200,g,118,20.6,7.2,0.8
Comida,14:00,Arroz cocido,180,g,234,4.3,50.8,0.5
Comida,14:00,Pechuga de pollo,180,g,297,55.8,0,6.5
Cena,21:00,Salmon,160,g,333,32.6,0,21.4
Cena,21:00,Patata cocida,250,g,218,4.8,50.3,0.3`

function NutritionImportContent() {
  const searchParams = useSearchParams()
  const preselectedAthleteId = searchParams.get('athleteId') ?? ''

  const { coach } = useCoachMe()
  const { athletes } = useAthletes(coach?.id)

  const [raw, setRaw] = useState(DEFAULT_INPUT)
  const [selectedAthleteId, setSelectedAthleteId] = useState(preselectedAthleteId)
  const [title, setTitle] = useState('Plan importado')
  const [phase, setPhase] = useState('Activo')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const headerInfo = useMemo(() => getNutritionCsvHeaders(raw), [raw])
  const [columnMap, setColumnMap] = useState<CsvColumnMap>({})

  const effectiveMap = useMemo(() => {
    const suggested = suggestNutritionColumnMap(headerInfo.headers)
    return {
      ...suggested,
      ...columnMap,
    }
  }, [headerInfo.headers, columnMap])

  const rows = useMemo(
    () => parseNutritionCsvWithMap(raw, effectiveMap, headerInfo.delimiter),
    [raw, effectiveMap, headerInfo.delimiter]
  )

  const groupedMeals = useMemo(() => {
    const map = new Map<string, { name: string; time: string; foods: typeof rows }>()
    rows.forEach((row) => {
      const key = `${row.mealName}__${row.mealTime}`
      const current = map.get(key)
      if (current) {
        current.foods.push(row)
      } else {
        map.set(key, { name: row.mealName, time: row.mealTime, foods: [row] })
      }
    })
    return Array.from(map.values())
  }, [rows])

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => ({
        kcal: acc.kcal + (row.kcal ?? 0),
        protein: acc.protein + (row.proteinG ?? 0),
        carbs: acc.carbs + (row.carbsG ?? 0),
        fat: acc.fat + (row.fatG ?? 0),
      }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0 }
    )
  }, [rows])

  async function handleSave() {
    if (!selectedAthleteId || groupedMeals.length === 0) return
    setSaving(true)
    try {
      const payload = {
        athleteId: selectedAthleteId,
        title,
        phase,
        kcalTarget: Math.round(totals.kcal),
        proteinG: Math.round(totals.protein),
        carbsG: Math.round(totals.carbs),
        fatG: Math.round(totals.fat),
        meals: groupedMeals.map((meal, i) => ({
          name: meal.name,
          time: meal.time,
          order: i,
          foods: meal.foods.map((f, j) => ({
            food: f.food,
            quantity: f.quantity,
            unit: f.unit,
            kcal: f.kcal,
            proteinG: f.proteinG,
            carbsG: f.carbsG,
            fatG: f.fatG,
            order: j,
          })),
        })),
      }

      const res = await fetch('/api/nutrition-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageShell>
      <SectionIntro
        eyebrow="Import CSV"
        title="Importación de dieta"
        description="Carga comida por CSV para generar un plan nutricional completo en segundos."
      />

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link
          href="/coach/import-lab"
          className="border-line text-foreground/70 hover:border-accent/30 hover:text-accent rounded-full border px-4 py-1.5"
        >
          Import entrenamiento
        </Link>
        <span className="border-accent/30 bg-accent/10 text-accent rounded-full border px-4 py-1.5">
          Import nutrición
        </span>
      </div>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="border-line bg-surface flex flex-col gap-4 rounded-4xl border p-6">
          <h2 className="text-xl font-semibold">Entrada CSV nutrición</h2>
          <textarea
            rows={14}
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value)
              setSaved(false)
            }}
            spellCheck={false}
            className="border-line bg-surface-strong text-foreground/80 focus:border-accent w-full resize-y rounded-3xl border px-4 py-3 font-mono text-xs leading-6 transition outline-none"
          />

          <div className="border-line bg-background/50 text-foreground/60 rounded-2xl border px-4 py-3 text-xs">
            Delimitador detectado:{' '}
            <span className="text-accent font-semibold">
              {headerInfo.delimiter === '\t' ? 'TAB' : headerInfo.delimiter}
            </span>
            <span className="mx-2">•</span>
            Cabeceras detectadas: {headerInfo.headers.length}
          </div>

          <div className="border-line bg-background/50 text-foreground/70 rounded-2xl border px-4 py-3 text-xs">
            <p className="text-foreground/80 mb-2 font-semibold">Mapeador de columnas</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ['mealName', 'Comida'],
                  ['mealTime', 'Hora'],
                  ['food', 'Alimento'],
                  ['quantity', 'Cantidad'],
                  ['unit', 'Unidad'],
                  ['kcal', 'Kcal'],
                  ['proteinG', 'Proteína'],
                  ['carbsG', 'Carbos'],
                  ['fatG', 'Grasas'],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="border-line bg-surface flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5"
                >
                  <span>{label}</span>
                  <select
                    value={(effectiveMap[key] as string | undefined) ?? ''}
                    onChange={(e) =>
                      setColumnMap((prev) => ({ ...prev, [key]: e.target.value || undefined }))
                    }
                    className="border-line bg-background text-foreground max-w-[60%] rounded border px-2 py-1 text-xs"
                  >
                    <option value="">(vacío)</option>
                    {headerInfo.headers.map((h) => (
                      <option key={`${key}-${h}`} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-foreground/60 text-xs font-medium">Atleta destino</label>
              <select
                value={selectedAthleteId}
                onChange={(e) => setSelectedAthleteId(e.target.value)}
                className="border-line bg-surface-strong focus:border-accent w-full rounded-2xl border px-3 py-2.5 text-sm transition outline-none"
              >
                <option value="">— Selecciona atleta —</option>
                {athletes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-foreground/60 text-xs font-medium">Título del plan</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border-line bg-surface-strong focus:border-accent w-full rounded-2xl border px-3 py-2.5 text-sm transition outline-none"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-foreground/60 text-xs font-medium">Fase</label>
              <input
                type="text"
                value={phase}
                onChange={(e) => setPhase(e.target.value)}
                className="border-line bg-surface-strong focus:border-accent w-full rounded-2xl border px-3 py-2.5 text-sm transition outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-foreground/60 text-xs font-medium">Filas válidas</label>
              <div className="border-line bg-surface-strong text-foreground/80 rounded-2xl border px-3 py-2.5 text-sm">
                {rows.length}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !selectedAthleteId || groupedMeals.length === 0}
              className="bg-accent hover:bg-accent-strong rounded-full px-6 py-3 text-sm font-semibold text-white transition disabled:pointer-events-none disabled:opacity-40"
            >
              {saving ? 'Guardando...' : 'Guardar plan nutricional'}
            </button>
            {saved && <span className="text-success text-sm font-medium">Plan guardado</span>}
          </div>
        </article>

        <article className="border-line bg-surface max-h-[80vh] overflow-auto rounded-4xl border p-6">
          <h2 className="mb-4 text-xl font-semibold">Vista previa</h2>
          <div className="mb-4 grid grid-cols-4 gap-2 text-center text-sm">
            <div className="border-line bg-surface-strong rounded-xl border p-2">
              <div className="text-accent font-bold">{Math.round(totals.kcal)}</div>
              <div className="text-foreground/50 text-xs">kcal</div>
            </div>
            <div className="border-success/30 bg-success/10 rounded-xl border p-2">
              <div className="text-success font-bold">{Math.round(totals.protein)}g</div>
              <div className="text-foreground/50 text-xs">P</div>
            </div>
            <div className="rounded-xl border border-(--macro-carbs)/30 bg-(--macro-carbs)/10 p-2">
              <div className="font-bold text-(--macro-carbs)">{Math.round(totals.carbs)}g</div>
              <div className="text-foreground/50 text-xs">C</div>
            </div>
            <div className="border-warning/30 bg-warning/10 rounded-xl border p-2">
              <div className="text-warning font-bold">{Math.round(totals.fat)}g</div>
              <div className="text-foreground/50 text-xs">G</div>
            </div>
          </div>

          <div className="space-y-3">
            {groupedMeals.map((meal, idx) => (
              <div
                key={`${meal.name}-${idx}`}
                className="border-line bg-surface-strong rounded-2xl border p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-semibold">{meal.name}</p>
                  <span className="text-foreground/50 text-xs">{meal.time}</span>
                </div>
                <div className="space-y-1">
                  {meal.foods.map((f, j) => (
                    <div
                      key={`${f.food}-${j}`}
                      className="text-foreground/70 flex items-center justify-between text-xs"
                    >
                      <span>{f.food}</span>
                      <span>
                        {f.quantity}
                        {f.unit} · {f.kcal ?? '?'} kcal
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </PageShell>
  )
}

export default function NutritionImportPage() {
  return (
    <Suspense
      fallback={
        <PageShell className="max-w-2xl">
          <p className="text-foreground/50">Cargando...</p>
        </PageShell>
      }
    >
      <NutritionImportContent />
    </Suspense>
  )
}
