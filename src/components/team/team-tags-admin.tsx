'use client'

import React, { useEffect, useState } from 'react'
import { useToast } from '@/components/ui/toast'

type Tag = { id: string; name: string; slug: string }

export default function TeamTagsAdmin() {
  const { pushToast } = useToast()
  const [teamId, setTeamId] = useState<string | null>(null)
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [canManage, setCanManage] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/teams/tags')
        if (res.ok) {
          const data = await res.json()
          if (!mounted) return
          setTeamId(data.teamId ?? null)
          setTags(data.tags ?? [])
          setCanManage(!!data.canManage)
        }
      } catch (err) {
        pushToast({ title: 'Error cargando etiquetas', variant: 'error' })
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
    if (!name) return pushToast({ title: 'Nombre requerido', variant: 'info' })
    try {
      const res = await fetch('/api/teams/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, name }),
      })
      if (res.ok) {
        const created = await res.json()
        setTags((s) => [...s, created])
        setName('')
        pushToast({ title: 'Etiqueta creada', variant: 'success' })
      } else {
        const err = await res.json()
        pushToast({ title: err.error ?? 'Error creando etiqueta', variant: 'error' })
      }
    } catch {
      pushToast({ title: 'Error creando etiqueta', variant: 'error' })
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar etiqueta?')) return
    try {
      const res = await fetch('/api/teams/tags', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, id }),
      })
      if (res.ok) {
        setTags((s) => s.filter((t) => t.id !== id))
        pushToast({ title: 'Etiqueta eliminada', variant: 'success' })
      } else {
        const err = await res.json()
        pushToast({ title: err.error ?? 'Error eliminando etiqueta', variant: 'error' })
      }
    } catch {
      pushToast({ title: 'Error eliminando etiqueta', variant: 'error' })
    }
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Etiquetas del equipo</h3>

      {canManage ? (
        <div className="bg-surface-strong rounded-2xl border p-4">
          <form onSubmit={handleCreate} className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-foreground/70 text-sm font-medium">Nueva etiqueta</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre de etiqueta"
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
            </div>
            <div>
              <button className="bg-accent rounded-xl px-4 py-2 text-white" type="submit">
                Crear
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-surface-strong text-foreground/60 mb-4 rounded-2xl border p-4">
          No tienes permisos para editar etiquetas del equipo.
        </div>
      )}

      <div className="grid gap-2">
        {tags.map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded-2xl border p-3">
            <div className="flex items-center gap-3">
              <span className="bg-accent/10 rounded-full px-3 py-1 text-sm font-medium">
                {t.name}
              </span>
              <div className="text-foreground/60 text-xs">{t.slug}</div>
            </div>
            <div>
              {canManage && (
                <button onClick={() => handleDelete(t.id)} className="text-danger text-sm">
                  Eliminar
                </button>
              )}
            </div>
          </div>
        ))}
        {tags.length === 0 && !loading && (
          <div className="text-foreground/60">No hay etiquetas.</div>
        )}
      </div>
    </div>
  )
}
