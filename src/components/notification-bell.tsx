"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
};

function formatRelative(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMin = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  return `hace ${diffDays} d`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadIds, setUnreadIds] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  async function refresh() {
    const [latestRes, unreadRes] = await Promise.all([
      fetch("/api/notifications?limit=6").catch(() => null),
      fetch("/api/notifications?unread=1&limit=50").catch(() => null),
    ]);

    if (latestRes?.ok) {
      const latest = await latestRes.json() as NotificationItem[];
      setItems(Array.isArray(latest) ? latest : []);
    }

    if (unreadRes?.ok) {
      const unread = await unreadRes.json() as NotificationItem[];
      const nextUnread = Array.isArray(unread) ? unread : [];
      setUnreadCount(nextUnread.length);
      setUnreadIds(nextUnread.map((item) => item.id));
    }
  }

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 20000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    function onMouseDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const visibleUnread = useMemo(() => new Set(items.filter((item) => !item.read).map((item) => item.id)), [items]);

  async function markAllRead() {
    if (unreadIds.length === 0) return;
    // Optimistic update
    const idsToMark = new Set(unreadIds);
    setItems((current) => current.map((item) => (idsToMark.has(item.id) ? { ...item, read: true } : item)));
    setUnreadCount(0);
    const prevIds = [...unreadIds];
    setUnreadIds([]);

    const response = await fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: prevIds }),
    }).catch(() => null);
    if (!response?.ok) {
      // Revertir si falla
      setItems((current) => current.map((item) => (idsToMark.has(item.id) ? { ...item, read: false } : item)));
      setUnreadCount(prevIds.length);
      setUnreadIds(prevIds);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Notificaciones"
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface transition hover:bg-surface-strong"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
          <path d="M10 17a2 2 0 0 0 4 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-40 w-[min(92vw,24rem)] rounded-3xl border border-line bg-background shadow-2xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Notificaciones</p>
              <p className="text-[11px] text-foreground/45">{unreadCount} sin leer</p>
            </div>
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="text-xs font-medium text-accent transition hover:text-accent-strong"
            >
              Marcar todo
            </button>
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-foreground/50">
              No hay notificaciones todavía.
            </div>
          ) : (
            <ul className="max-h-96 overflow-y-auto p-2">
              {items.map((item) => {
                const content = (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      {!item.read && <span className="mt-1 h-2 w-2 rounded-full bg-accent" />}
                    </div>
                    {item.body ? <p className="mt-1 text-xs text-foreground/60">{item.body}</p> : null}
                    <p className="mt-2 text-[11px] text-foreground/35">{formatRelative(item.createdAt)}</p>
                  </>
                );

                if (item.link) {
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.link}
                        onClick={() => setOpen(false)}
                        className={`block rounded-2xl px-3 py-3 transition hover:bg-surface ${!item.read ? "bg-accent/5" : ""}`}
                      >
                        {content}
                      </Link>
                    </li>
                  );
                }

                return (
                  <li key={item.id} className={`rounded-2xl px-3 py-3 ${!item.read ? "bg-accent/5" : ""}`}>
                    {content}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
