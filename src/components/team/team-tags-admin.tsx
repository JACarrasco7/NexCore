"use client"

import React, { useEffect, useState } from 'react'
import { apiFetch, apiPost } from '@/lib/store'
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
        const data = await apiFetch<{ teamId?: string; tags?: Tag[]; canManage?: boolean }>('/api/teams/tags')
        if (!mounted) return
        setTeamId(data.teamId ?? null)
        setTags(data.tags ?? [])
        setCanManage(!!data.canManage)
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
      const created = await apiPost<Tag>('/api/teams/tags', { teamId, name })
      setTags((s) => [...s, created])
      setName('')
      pushToast({ title: 'Etiqueta creada', variant: 'success' })
    } catch (err: any) {
      pushToast({ title: err?.message ?? 'Error creando etiqueta', variant: 'error' })
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar etiqueta?')) return
    try {
      await apiPost('/api/teams/tags', { teamId, id, _method: 'DELETE' })
      setTags((s) => s.filter((t) => t.id !== id))
      pushToast({ title: 'Etiqueta eliminada', variant: 'success' })
    } catch (err: any) {
      pushToast({ title: err?.message ?? 'Error eliminando etiqueta', variant: 'error' })
    }
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Etiquetas del equipo</h3>

      {canManage ? (
        <div className="rounded-2xl border bg-surface-strong p-4">
          <form onSubmit={handleCreate} className="flex gap-3 items-center">
            <div className="flex-1">
              <label className="text-sm font-medium text-foreground/70">Nueva etiqueta</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre de etiqueta" className="mt-1 w-full rounded-xl border px-3 py-2" />
            </div>
            <div>
              <button className="rounded-xl bg-accent px-4 py-2 text-white" type="submit">Crear</button>
            </div>
          </form>
        </div>
      ) : (
        <div className="mb-4 rounded-2xl border bg-surface-strong p-4 text-foreground/60">No tienes permisos para editar etiquetas del equipo.</div>
      )}

      <div className="grid gap-2">
        {tags.map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded-2xl border p-3">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-accent/10 px-3 py-1 text-sm font-medium">{t.name}</span>
              <div className="text-xs text-foreground/60">{t.slug}</div>
            </div>
            <div>
              {canManage && <button onClick={() => handleDelete(t.id)} className="text-sm text-danger">Eliminar</button>}
            </div>
          </div>
        ))}
        {tags.length === 0 && !loading && <div className="text-foreground/60">No hay etiquetas.</div>}
      </div>
    </div>
  )
}
