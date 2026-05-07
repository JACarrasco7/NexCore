"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ChatPanel } from "@/components/chat-panel";

type InboxItem = {
  athleteId: string;
  userId: string;
  displayName: string;
  lastMessage: { content: string; createdAt: string; fromMe: boolean } | null;
  unreadCount: number;
};

type AthleteKpi = {
  fullName: string;
  goal: string;
  phaseLabel: string;
  avgAdherence: number | null;
  activePlanTitle: string | null;
  lastCheckIn: { date: string; weightKg: number; adherencePct: number } | null;
};

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "ahora";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function AthleteKpiPanel({ athleteId }: { athleteId: string }) {
  const [data, setData] = useState<AthleteKpi | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setData(null);
    fetch(`/api/athletes/${athleteId}/overview`)
      .then((r) => r.json())
      .then((d) => {
        const lastCheckIn = d.checkIns?.[0] ?? null;
        const activePlan = d.plans?.find((p: { isActive?: boolean; title: string }) => p.isActive) ?? d.plans?.[0] ?? null;
        setData({
          fullName: d.fullName ?? "Atleta",
          goal: d.goal ?? "—",
          phaseLabel: d.phaseLabel ?? "—",
          avgAdherence: d.avgAdherence ?? null,
          activePlanTitle: activePlan?.title ?? null,
          lastCheckIn: lastCheckIn
            ? { date: lastCheckIn.date, weightKg: lastCheckIn.weightKg, adherencePct: lastCheckIn.adherencePct }
            : null,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [athleteId]);

  if (loading) {
    return (
      <div className="p-5 space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-xl bg-surface-strong" />
        ))}
      </div>
    );
  }
  if (!data) return <p className="p-5 text-sm text-foreground/40">Sin datos</p>;

  const goalLabels: Record<string, string> = {
    volumen: "Volumen",
    definicion: "Definición",
    mantenimiento: "Mantenimiento",
    "peak-week": "Peak Week",
  };
  const goalTones: Record<string, string> = {
    volumen: "text-success",
    definicion: "text-warning",
    mantenimiento: "text-foreground/50",
    "peak-week": "text-danger",
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Cabecera atleta */}
      <div className="border-b border-line p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-sm font-bold text-accent">
            {data.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">{data.fullName}</p>
            <p className={`text-xs font-medium ${goalTones[data.goal] ?? "text-foreground/50"}`}>
              {goalLabels[data.goal] ?? data.goal}
            </p>
          </div>
        </div>
        <p className="mt-2 text-xs text-foreground/45">{data.phaseLabel}</p>
      </div>

      {/* KPIs */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {data.avgAdherence != null && (
          <div className="rounded-xl border border-line bg-background p-3">
            <p className="text-[10px] uppercase tracking-widest text-foreground/40">Adherencia media</p>
            <p
              className={`mt-0.5 text-2xl font-bold ${
                data.avgAdherence >= 80
                  ? "text-success"
                  : data.avgAdherence >= 60
                  ? "text-warning"
                  : "text-danger"
              }`}
            >
              {data.avgAdherence}%
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-strong">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${data.avgAdherence}%` }}
              />
            </div>
          </div>
        )}

        {data.lastCheckIn && (
          <div className="rounded-xl border border-line bg-background p-3 space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-foreground/40">Último check-in</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-foreground/45">Peso</p>
                <p className="text-base font-semibold">{data.lastCheckIn.weightKg} kg</p>
              </div>
              <div>
                <p className="text-xs text-foreground/45">Adherencia</p>
                <p className="text-base font-semibold">{data.lastCheckIn.adherencePct}%</p>
              </div>
            </div>
            <p className="text-xs text-foreground/35">
              {new Date(data.lastCheckIn.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
            </p>
          </div>
        )}

        {data.activePlanTitle && (
          <div className="rounded-xl border border-line bg-background p-3">
            <p className="text-[10px] uppercase tracking-widest text-foreground/40">Plan activo</p>
            <p className="mt-0.5 truncate text-sm font-semibold">{data.activePlanTitle}</p>
          </div>
        )}

        <Link
          href={`/coach/athletes/${athleteId}`}
          className="flex items-center justify-between rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm font-semibold text-accent transition hover:bg-accent/10"
        >
          Ver perfil completo →
        </Link>
      </div>
    </div>
  );
}

export default function CoachMessagesPage() {
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<InboxItem | null>(null);

  const loadInbox = useCallback(() => {
    fetch("/api/coach/inbox")
      .then((r) => r.json())
      .then((d) => {
        setInbox(Array.isArray(d) ? d : (d?.conversations ?? []));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  function selectAthlete(item: InboxItem) {
    setSelected(item);
    setInbox((prev) =>
      prev.map((i) => (i.userId === item.userId ? { ...i, unreadCount: 0 } : i))
    );
  }

  const totalUnread = inbox.reduce((s, i) => s + i.unreadCount, 0);

  return (
    <div className="mx-auto w-full max-w-[1480px] px-6 py-6 md:px-10 lg:px-12">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-foreground/40">Coach dashboard</p>
          <h1 className="mt-1 text-2xl font-bold">Mensajes</h1>
        </div>
        {totalUnread > 0 && (
          <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-white">
            {totalUnread} sin leer
          </span>
        )}
      </div>

      {/* 3-column chat layout */}
      <div className="grid h-[calc(100vh-180px)] overflow-hidden rounded-2xl border border-line bg-surface-strong lg:grid-cols-[280px_1fr] xl:grid-cols-[280px_1fr_300px]">

        {/* Col 1: lista de contactos */}
        <aside className="flex flex-col border-r border-line overflow-hidden">
          <div className="border-b border-line px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-foreground/45">
              Conversaciones
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-background" />
                ))}
              </div>
            ) : inbox.length === 0 ? (
              <p className="p-4 text-sm text-foreground/40">
                Ningún atleta tiene cuenta aún.
              </p>
            ) : (
              <div className="p-2 space-y-0.5">
                {inbox.map((item) => (
                  <button
                    key={item.userId}
                    onClick={() => selectAthlete(item)}
                    className={`w-full rounded-xl px-3 py-3 text-left transition ${
                      selected?.userId === item.userId
                        ? "bg-accent/10 border border-accent/20"
                        : "hover:bg-background/70"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-xs font-bold text-accent">
                          {item.displayName.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate text-sm font-semibold">{item.displayName}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {item.unreadCount > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-white">
                            {item.unreadCount}
                          </span>
                        )}
                        {item.lastMessage && (
                          <span className="text-[10px] text-foreground/30">
                            {formatRelative(item.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    {item.lastMessage ? (
                      <p className="ml-10 mt-0.5 truncate text-xs text-foreground/45">
                        {item.lastMessage.fromMe ? "Tú: " : ""}
                        {item.lastMessage.content}
                      </p>
                    ) : (
                      <p className="ml-10 mt-0.5 text-xs italic text-foreground/25">
                        Sin mensajes aún
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Col 2: hilo de chat */}
        <div className="flex min-w-0 flex-col overflow-hidden">
          {selected ? (
            <ChatPanel
              withUserId={selected.userId}
              withName={selected.displayName}
              athleteId={selected.athleteId}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-foreground/30">
              <span className="text-4xl">💬</span>
              <p className="text-sm">Selecciona una conversación</p>
            </div>
          )}
        </div>

        {/* Col 3: metadata del atleta (solo xl) */}
        <aside className="hidden border-l border-line overflow-hidden xl:flex xl:flex-col">
          {selected ? (
            <AthleteKpiPanel athleteId={selected.athleteId} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1 text-foreground/25">
              <span className="text-3xl">👤</span>
              <p className="text-xs">Selecciona un atleta</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
