'use client'

import React, { useEffect, useState } from 'react'
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
        const res = await fetch('/api/teams/phases')
        if (res.ok) {
          const data = await res.json()
          if (!mounted) return
          setTeamId(data.teamId ?? null)
          setPhases(data.phases ?? [])
          setCanManage(!!data.canManage)
        }
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
      const res = await fetch('/api/teams/phases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, code, label, description: desc, order }),
      })

      if (res.ok) {
        const created = await res.json()
        setPhases((s) => [...s, created])
        setLabel('')
        setCode('')
        setDesc('')
        setOrder(0)
        pushToast({ title: 'Fase creada', variant: 'success' })
      } else {
        const err = await res.json()
        pushToast({ title: err.error ?? 'Error creando fase', variant: 'error' })
      }
    } catch (err) {
      pushToast({ title: 'Error creando fase', variant: 'error' })
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Confirmar eliminar fase?')) return
    try {
      const res = await fetch('/api/teams/phases', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        setPhases((s) => s.filter((p) => p.id !== id))
        pushToast({ title: 'Fase eliminada', variant: 'success' })
      } else {
        const err = await res.json()
        pushToast({ title: err.error ?? 'Error eliminando', variant: 'error' })
      }
    } catch (err) {
      pushToast({ title: 'Error eliminando', variant: 'error' })
    }
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Fases del equipo</h3>

      {canManage ? (
        <div className="bg-surface-strong rounded-2xl border p-6">
          <form onSubmit={handleCreate} className="grid items-end gap-3 sm:grid-cols-4">
            <div className="flex flex-col">
              <label className="text-foreground/70 text-sm font-medium">Código</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="S1"
                className="mt-1 rounded-xl border px-3 py-2"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-foreground/70 text-sm font-medium">Etiqueta</label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Semana 1"
                className="mt-1 rounded-xl border px-3 py-2"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-foreground/70 text-sm font-medium">Orden</label>
              <input
                value={String(order)}
                onChange={(e) => setOrder(Number(e.target.value))}
                type="number"
                placeholder="0"
                className="mt-1 rounded-xl border px-3 py-2"
              />
            </div>

            <div className="flex items-center">
              <button className="bg-accent rounded-xl px-4 py-2 text-white" type="submit">
                Crear fase
              </button>
            </div>

            <div className="sm:col-span-4">
              <label className="text-foreground/70 text-sm font-medium">
                Descripción (opcional)
              </label>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Notas sobre la fase"
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-surface-strong text-foreground/60 mb-4 rounded-2xl border p-4">
          No tienes permisos para editar las fases del equipo.
        </div>
      )}

      <div className="grid gap-3">
        {phases.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between rounded-2xl border bg-white p-4"
          >
            <div>
              <div className="font-semibold">
                {p.label} <span className="text-foreground/60 text-xs">({p.code})</span>
              </div>
              {p.description && <div className="text-foreground/60 text-sm">{p.description}</div>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleDelete(p.id)} className="text-danger text-sm">
                Eliminar
              </button>
            </div>
          </div>
        ))}
        {phases.length === 0 && !loading && (
          <div className="text-foreground/60">No hay fases definidas.</div>
        )}
      </div>
    </div>
  )
}
