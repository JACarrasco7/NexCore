"use client"

import React, { useEffect, useState } from 'react'
import { apiFetch, apiPost } from '@/lib/store'
import { useToast } from '@/components/ui/toast'

type Phase = {
  id: string
  code: string
  label: string
  description?: string | null
  order?: number
}

export default function TeamPhasesAdmin() {
  const { pushToast } = useToast()
  const [teamId, setTeamId] = useState<string | null>(null)
  const [phases, setPhases] = useState<Phase[]>([])
  const [loading, setLoading] = useState(true)
  const [canManage, setCanManage] = useState(false)

  const [code, setCode] = useState('')
  const [label, setLabel] = useState('')
  const [desc, setDesc] = useState('')
  const [order, setOrder] = useState<number>(0)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const data = await apiFetch<{ teamId?: string; phases?: Phase[]; canManage?: boolean }>('/api/teams/phases')
        if (!mounted) return
        setTeamId(data.teamId ?? null)
        setPhases(data.phases ?? [])
        setCanManage(!!data.canManage)
      } catch (err) {
        pushToast({ title: 'Error cargando fases', variant: 'error' })
      } finally {
        setLoading(false)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [pushToast])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!label || !code) {
      pushToast({ title: 'Código y etiqueta son requeridos', variant: 'info' })
      return
    }

    try {
      const created = await apiPost<Phase>('/api/teams/phases', { teamId, code, label, description: desc, order })
      setPhases((s) => [...s, created])
      setLabel('')
      setCode('')
      setDesc('')
      setOrder(0)
      pushToast({ title: 'Fase creada', variant: 'success' })
    } catch (err: any) {
      pushToast({ title: err?.message ?? 'Error creando fase', variant: 'error' })
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Confirmar eliminar fase?')) return
    try {
      await apiPost('/api/teams/phases', { id, _method: 'DELETE' })
      setPhases((s) => s.filter((p) => p.id !== id))
      pushToast({ title: 'Fase eliminada', variant: 'success' })
    } catch (err: any) {
      pushToast({ title: err?.message ?? 'Error eliminando', variant: 'error' })
    }
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Fases del equipo</h3>

      {canManage ? (
        <div className="rounded-2xl border bg-surface-strong p-6">
          <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-4 items-end">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-foreground/70">Código</label>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="S1" className="mt-1 rounded-xl border px-3 py-2" />
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-foreground/70">Etiqueta</label>
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Semana 1" className="mt-1 rounded-xl border px-3 py-2" />
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-foreground/70">Orden</label>
              <input value={String(order)} onChange={(e) => setOrder(Number(e.target.value))} type="number" placeholder="0" className="mt-1 rounded-xl border px-3 py-2" />
            </div>

            <div className="flex items-center">
              <button className="rounded-xl bg-accent px-4 py-2 text-white" type="submit">Crear fase</button>
            </div>

            <div className="sm:col-span-4">
              <label className="text-sm font-medium text-foreground/70">Descripción (opcional)</label>
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Notas sobre la fase" className="mt-1 w-full rounded-xl border px-3 py-2" />
            </div>
          </form>
        </div>
      ) : (
        <div className="mb-4 rounded-2xl border bg-surface-strong p-4 text-foreground/60">No tienes permisos para editar las fases del equipo.</div>
      )}

      <div className="grid gap-3">
        {phases.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-2xl border p-4 bg-white">
            <div>
              <div className="font-semibold">{p.label} <span className="text-xs text-foreground/60">({p.code})</span></div>
              {p.description && <div className="text-sm text-foreground/60">{p.description}</div>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleDelete(p.id)} className="text-sm text-danger">Eliminar</button>
            </div>
          </div>
        ))}
        {phases.length === 0 && !loading && <div className="text-foreground/60">No hay fases definidas.</div>}
      </div>
    </div>
  )
}
