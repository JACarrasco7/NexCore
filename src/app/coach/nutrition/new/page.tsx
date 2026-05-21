 'use client'
 export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
 import { useRouter } from 'next/navigation'
 import { PageShell } from '@/components/layout'
 import { SectionIntro } from '@/components/section-intro'
 import { useToast } from '@/components/ui/toast'
 import { Skeleton } from '@/components/ui/skeleton'
import { apiFetch } from '@/lib/store'

 type Athlete = { id: string; fullName: string }

 export default function NewNutritionPage() {
  const router = useRouter()
  const { pushToast } = useToast()
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const data = await apiFetch<any>('/api/athletes')
        const arr = Array.isArray(data) ? data : data?.items ?? data?.athletes ?? []
        if (!mounted) return
        setAthletes(
          (arr as any[]).map((a) => ({ id: a.id, fullName: a.fullName ?? a.name ?? a.id }))
        )
      } catch {
        pushToast({ title: 'No se pudieron cargar atletas', variant: 'error' })
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [pushToast])

  function handleCreate() {
    if (!selected) {
      pushToast({ title: 'Selecciona un atleta', variant: 'info' })
      return
    }
    router.push(`/coach/nutrition?athleteId=${selected}&create=true`)
  }

  return (
    <PageShell className="max-w-2xl gap-6 px-4 py-8 sm:px-6">
      <SectionIntro eyebrow="Nutrición" title="Nuevo plan nutricional" description="Crea un plan nutricional y asígnalo a un atleta." />

      {loading ? (
        <Skeleton className="mt-4 h-40" />
      ) : (
        <div className="border-line bg-surface rounded-4xl border p-6 sm:p-8">
          <div className="mb-4">
            <label className="text-foreground/80 mb-2 block text-sm font-medium">Asignar a atleta</label>
            <select
              className="border-line bg-surface-strong focus:ring-accent w-full rounded-2xl border px-4 py-3 text-sm focus:ring-1 focus:outline-none"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">— Selecciona un atleta —</option>
              {athletes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.fullName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => router.push('/coach/nutrition')}
              className="border-line rounded-2xl border px-4 py-2"
            >
              Cancelar
            </button>
            <button onClick={handleCreate} className="bg-accent text-white rounded-2xl px-5 py-2">
              Crear plan
            </button>
          </div>
        </div>
      )}
    </PageShell>
  )
 }
