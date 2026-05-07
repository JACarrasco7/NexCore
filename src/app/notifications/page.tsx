"use client";

import { useEffect, useState } from "react";
import NotificationDetail from "@/components/notification-detail";

type Notif = {
  id: string;
  title: string;
  body?: string | null;
  link?: string | null;
  read: boolean;
  createdAt: string;
  channel?: string;
  deliveryStatus?: string;
};

export default function NotificationsPage() {
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications?limit=50');
      if (!res.ok) throw new Error('no auth');
      const json = await res.json();
      setItems(Array.isArray(json) ? json : []);
    } catch (err) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function markRead(id: string) {
    // optimistic
    setItems((cur) => cur.map((it) => (it.id === id ? { ...it, read: true } : it)));
    try {
      await fetch('/api/notifications/mark-read', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ids: [id] }) });
    } catch {
      // ignore
    }
  }

  return (
    <main className="p-6">
      <div className="max-w-4xl">
        <h2 className="text-2xl font-semibold">Notificaciones</h2>
        <p className="mt-2 text-sm text-foreground/60">Historial de notificaciones y estado de entrega por canal.</p>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[1fr_360px]">
          <section className="rounded-2xl border border-line bg-surface p-4">
            {loading ? (
              <p className="text-sm text-foreground/50">Cargando...</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-foreground/50">No hay notificaciones.</p>
            ) : (
              <ul className="space-y-3">
                {items.map((n) => (
                  <li key={n.id} className={`flex items-start justify-between gap-3 rounded-xl p-3 ${!n.read ? 'bg-accent/5' : ''}`}>
                    <div>
                      <button onClick={() => { setSelected(n.id); }} className="text-left">
                        <p className="text-sm font-semibold">{n.title}</p>
                        {n.body && <p className="mt-1 text-xs text-foreground/60">{n.body}</p>}
                        <p className="mt-2 text-[11px] text-foreground/40">{new Date(n.createdAt).toLocaleString()}</p>
                      </button>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-xs text-foreground/45">{n.channel}</span>
                      <div className="flex gap-2">
                        {!n.read && (
                          <button onClick={() => void markRead(n.id)} className="rounded-md border border-line px-2 py-1 text-xs">Marcar leído</button>
                        )}
                        <button onClick={() => void load()} className="rounded-md border border-line px-2 py-1 text-xs">Refrescar</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <aside className="rounded-2xl border border-line bg-surface p-4">
            {selected ? (
              <NotificationDetail notificationId={selected} />
            ) : (
              <p className="text-sm text-foreground/50">Selecciona una notificación para ver el estado de entrega.</p>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
