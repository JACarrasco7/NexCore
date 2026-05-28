'use client'

import { useEffect, useState } from 'react'
import NotificationDetail from '@/components/notification-detail'
import { apiFetch, apiPost } from '@/lib/store'

type Notif = {
  id: string
  title: string
  body?: string | null
  link?: string | null
  read: boolean
  createdAt: string
  channel?: string
  deliveryStatus?: string
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notif[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const data = await apiFetch<any>('/api/notifications?take=50').catch(() => [])
      const arr = Array.isArray(data) ? data : (data?.items ?? [])
      setItems(Array.isArray(arr) ? arr : [])
    } catch (err) {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function markRead(id: string) {
    // optimistic
    setItems((cur) => cur.map((it) => (it.id === id ? { ...it, read: true } : it)))
    try {
      await apiPost('/api/notifications/mark-read', { ids: [id] })
    } catch {
      // ignore
    }
  }

  return (
    <main className="p-6">
      <div className="max-w-4xl">
        <h2 className="text-2xl font-semibold">Notificaciones</h2>
        <p className="text-foreground/60 mt-2 text-sm">
          Historial de notificaciones y estado de entrega por canal.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[1fr_360px]">
          <section className="border-line bg-surface rounded-2xl border p-4">
            {loading ? (
              <p className="text-foreground/50 text-sm">Cargando...</p>
            ) : items.length === 0 ? (
              <p className="text-foreground/50 text-sm">No hay notificaciones.</p>
            ) : (
              <ul className="space-y-3">
                {items.map((n) => (
                  <li
                    key={n.id}
                    className={`flex items-start justify-between gap-3 rounded-xl p-3 ${!n.read ? 'bg-accent/5' : ''}`}
                  >
                    <div>
                      <button
                        onClick={() => {
                          setSelected(n.id)
                        }}
                        className="text-left"
                      >
                        <p className="text-sm font-semibold">{n.title}</p>
                        {n.body && <p className="text-foreground/60 mt-1 text-xs">{n.body}</p>}
                        <p className="text-foreground/40 mt-2 text-[11px]">
                          {new Date(n.createdAt).toLocaleString()}
                        </p>
                      </button>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-foreground/45 text-xs">{n.channel}</span>
                      <div className="flex gap-2">
                        {!n.read && (
                          <button
                            onClick={() => void markRead(n.id)}
                            className="border-line rounded-md border px-2 py-1 text-xs"
                          >
                            Marcar leído
                          </button>
                        )}
                        <button
                          onClick={() => void load()}
                          className="border-line rounded-md border px-2 py-1 text-xs"
                        >
                          Refrescar
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <aside className="border-line bg-surface rounded-2xl border p-4">
            {selected ? (
              <NotificationDetail notificationId={selected} />
            ) : (
              <p className="text-foreground/50 text-sm">
                Selecciona una notificación para ver el estado de entrega.
              </p>
            )}
          </aside>
        </div>
      </div>
    </main>
  )
}
