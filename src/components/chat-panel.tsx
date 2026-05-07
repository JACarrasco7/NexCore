"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";

type MsgUser = { id: string; name: string | null; email: string | null; role: string };
type Msg = {
  id: string;
  fromUserId: string;
  toUserId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
  from: MsgUser;
};

type ChatPanelProps = {
  /** userId del otro participante */
  withUserId: string;
  /** Nombre a mostrar en el header */
  withName: string;
  /** athleteId de contexto (hilo específico) */
  athleteId?: string;
};

type EmojiGroup = { group: string; items: string[] };

export function ChatPanel({ withUserId, withName, athleteId }: ChatPanelProps) {
  const { data: session } = useSession();
  const myId = session?.user?.id;
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiGroups, setEmojiGroups] = useState<EmojiGroup[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    const qs = new URLSearchParams({ withUserId });
    if (athleteId) qs.set("athleteId", athleteId);
    const res = await fetch(`/api/messages?${qs}`);
    if (res.ok) {
      const data: Msg[] = await res.json();
      setMessages(data);
    }
  }, [withUserId, athleteId]);

  useEffect(() => {
    fetchMessages();
    pollingRef.current = setInterval(fetchMessages, 4000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setEmojiOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function toggleEmojis() {
    if (!emojiOpen && emojiGroups.length === 0) {
      const res = await fetch("/api/emojis");
      if (res.ok) {
        const data: EmojiGroup[] = await res.json();
        setEmojiGroups(data);
      }
    }
    setEmojiOpen((v) => !v);
  }

  function addEmoji(emoji: string) {
    setText((prev) => `${prev}${emoji}`);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !myId) return;
    setSending(true);

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Msg = {
      id: tempId,
      fromUserId: myId,
      toUserId: withUserId,
      content: text.trim(),
      readAt: null,
      createdAt: new Date().toISOString(),
      from: { id: myId, name: session?.user?.name ?? null, email: session?.user?.email ?? null, role: "ATHLETE" },
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    const sentText = text.trim();
    setText("");

    const body: Record<string, string> = { toUserId: withUserId, content: sentText };
    if (athleteId) body.athleteId = athleteId;
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const msg: Msg = await res.json();
      // Reemplazar el temporal con el real
      setMessages((prev) => prev.map((m) => (m.id === tempId ? msg : m)));
    } else {
      // Revertir
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(sentText);
    }
    setSending(false);
  }

  function fmtTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  }
  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  }

  let lastDate = "";

  return (
    <section className="rounded-4xl border border-line bg-surface">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">
          {(withName[0] ?? "?").toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold">{withName}</p>
          <p className="text-[10px] text-foreground/40">Chat directo · actualización cada 4 s</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex max-h-80 flex-col gap-2 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <p className="text-center text-xs text-foreground/30">Sin mensajes todavía. Empieza la conversación.</p>
        )}
        {messages.map((msg) => {
          const isMine = msg.fromUserId === myId;
          const dateStr = fmtDate(msg.createdAt);
          const showDate = dateStr !== lastDate;
          lastDate = dateStr;
          return (
            <div key={msg.id}>
              {showDate && (
                <p className="my-2 text-center text-[10px] text-foreground/30">{dateStr}</p>
              )}
              <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                    isMine
                      ? "rounded-br-sm bg-accent text-white"
                      : "rounded-bl-sm border border-line bg-surface-strong text-foreground"
                  }`}
                >
                  <p>{msg.content}</p>
                  <p className={`mt-0.5 text-right text-[10px] ${isMine ? "text-white/50" : "text-foreground/30"}`}>
                    {fmtTime(msg.createdAt)}
                    {isMine && msg.readAt && " · Leído"}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="relative flex gap-2 border-t border-line px-4 py-3">
        <div className="relative" ref={emojiRef}>
          <button
            type="button"
            onClick={toggleEmojis}
            className="rounded-xl border border-line bg-surface-strong px-3 py-2 text-sm transition hover:border-accent/40"
            aria-label="Abrir emoticonos"
          >
            😊
          </button>
          {emojiOpen && (
            <div className="absolute bottom-12 left-0 z-20 w-72 max-h-64 overflow-y-auto rounded-2xl border border-line bg-background p-3 shadow-xl">
              {emojiGroups.map((g) => (
                <div key={g.group} className="mb-2 last:mb-0">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-foreground/40">{g.group}</p>
                  <div className="flex flex-wrap gap-1">
                    {g.items.map((emoji) => (
                      <button
                        key={`${g.group}-${emoji}`}
                        type="button"
                        onClick={() => addEmoji(emoji)}
                        className="rounded-lg px-2 py-1 text-lg transition hover:bg-surface"
                        aria-label={`Insertar ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe un mensaje..."
          disabled={!myId}
          className="flex-1 rounded-xl border border-line bg-surface-strong px-3 py-2 text-sm outline-none transition focus:border-accent"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending || !myId}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:opacity-40"
        >
          {sending ? "..." : "Enviar"}
        </button>
      </form>
    </section>
  );
}
