"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { ChatPanel } from "@/components/chat-panel";

// ── Tipos ────────────────────────────────────────────────────────────────────
type InboxItem = {
  athleteId: string;
  userId: string;
  displayName: string;
  lastMessage: { content: string; createdAt: string; fromMe: boolean } | null;
  unreadCount: number;
};

type CoachInfo = { id: string; userId: string; displayName: string };

// ── Icono de burbuja de chat ──────────────────────────────────────────────────
function BubbleIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

// ── FloatingChat ─────────────────────────────────────────────────────────────
export function FloatingChat({ unread = 0 }: { unread?: number }) {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role;
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Estado para atleta (coach → lista de atletas)
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<InboxItem | null>(
    null,
  );

  // Estado para atleta (athlete → su coach)
  const [coachInfo, setCoachInfo] = useState<CoachInfo | null>(null);
  const [loadingCoach, setLoadingCoach] = useState(false);

  // Cerrar al clicar fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Cuando se abre: cargar datos según rol
  useEffect(() => {
    if (!open) return;
    if (role === "COACH" || role === "ADMIN") {
      fetch("/api/coach/inbox")
        .then((r) => r.json())
        .then((d) => setInbox(Array.isArray(d) ? d : (d?.conversations ?? [])))
        .catch(() => {});
    } else if (role === "ATHLETE") {
      if (coachInfo) return;
      setLoadingCoach(true);
      fetch("/api/me/coach-for-athlete")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d) setCoachInfo(d);
        })
        .catch(() => {})
        .finally(() => setLoadingCoach(false));
    }
  }, [open, role, coachInfo]);

  if (!session?.user) return null;

  // ── Contenido del panel según rol ─────────────────────────────────────────
  function PanelContent() {
    if (role === "ATHLETE") {
      if (loadingCoach)
        return (
          <p className="p-6 text-sm text-foreground/50">Buscando tu coach...</p>
        );
      if (!coachInfo)
        return (
          <div className="p-6 text-sm text-foreground/50">
            <p>No tienes coach asignado aún.</p>
          </div>
        );
      return (
        <ChatPanel
          withUserId={coachInfo.userId}
          withName={coachInfo.displayName}
        />
      );
    }

    // COACH / ADMIN
    if (selectedAthlete) {
      return (
        <div className="flex flex-col h-full">
          <button
            onClick={() => setSelectedAthlete(null)}
            className="flex items-center gap-2 border-b border-line px-4 py-2.5 text-xs text-foreground/60 hover:text-foreground transition"
          >
            ← Todos los atletas
          </button>
          <div className="flex-1 overflow-hidden">
            <ChatPanel
              withUserId={selectedAthlete.userId}
              withName={selectedAthlete.displayName}
              athleteId={selectedAthlete.athleteId}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-line px-4 py-3">
          <p className="text-sm font-semibold">Conversaciones</p>
        </div>
        {inbox.length === 0 ? (
          <p className="p-6 text-sm text-foreground/50">
            Ningún atleta tiene cuenta de usuario aún.
          </p>
        ) : (
          <ul className="flex-1 overflow-y-auto">
            {inbox.map((item) => (
              <li key={item.userId}>
                <button
                  onClick={() => setSelectedAthlete(item)}
                  className="w-full px-4 py-3 text-left hover:bg-surface-strong transition border-b border-line/50 last:border-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">
                      {item.displayName}
                    </span>
                    {item.unreadCount > 0 && (
                      <span className="shrink-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[10px] font-bold text-white">
                        {item.unreadCount}
                      </span>
                    )}
                  </div>
                  {item.lastMessage && (
                    <p className="mt-0.5 text-xs text-foreground/50 truncate">
                      {item.lastMessage.fromMe ? "Tú: " : ""}
                      {item.lastMessage.content}
                    </p>
                  )}
                  {!item.lastMessage && (
                    <p className="mt-0.5 text-xs text-foreground/30 italic">
                      Sin mensajes aún
                    </p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3"
      ref={panelRef}
    >
      {/* Panel */}
      {open && (
        <div className="w-85 max-h-130 overflow-hidden rounded-3xl border border-line bg-background shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 duration-200">
          {/* Header del panel */}
          <div className="flex items-center justify-between border-b border-line px-4 py-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-accent">
                <BubbleIcon />
              </span>
              <p className="text-sm font-semibold">
                {role === "ATHLETE"
                  ? (coachInfo?.displayName ?? "Chat con tu coach")
                  : "Mensajes"}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-foreground/40 hover:bg-surface-strong hover:text-foreground transition"
              aria-label="Cerrar chat"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-hidden min-h-0">
            <PanelContent />
          </div>
        </div>
      )}

      {/* Botón burbuja */}
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open) setSelectedAthlete(null);
        }}
        aria-label="Chat"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg transition hover:bg-accent-strong active:scale-95"
      >
        {open ? (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <>
            <BubbleIcon />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </>
        )}
      </button>
    </div>
  );
}
