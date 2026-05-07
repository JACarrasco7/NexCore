"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";

type PostAuthor = { id: string; name: string | null; email: string | null; role: string };
type Comment = { id: string; postId: string; authorId: string; content: string; createdAt: string; author: PostAuthor };
type Post = {
  id: string;
  authorId: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  author: PostAuthor;
  comments: Comment[];
};

function initials(u: PostAuthor) {
  return ((u.name ?? u.email ?? "?")[0]).toUpperCase();
}
function displayName(u: PostAuthor) {
  return u.name ?? u.email ?? "Usuario";
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
function roleLabel(r: string) {
  return r === "COACH" ? "Coach" : r === "ADMIN" ? "Admin" : "Atleta";
}

function CommentList({ postId, comments: initial, myId }: { postId: string; comments: Comment[]; myId?: string }) {
  const [comments, setComments] = useState<Comment[]>(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    const res = await fetch(`/api/team-posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text.trim() }),
    });
    if (res.ok) {
      const c: Comment = await res.json();
      setComments((prev) => [...prev, c]);
      setText("");
    }
    setSending(false);
  }

  return (
    <div className="border-t border-line px-4 pb-3 pt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-foreground/40 hover:text-foreground transition"
      >
        {open ? "Ocultar" : `Comentarios (${comments.length})`}
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-strong text-[10px] font-bold">
                {initials(c.author)}
              </span>
              <div className="flex-1 rounded-xl border border-line bg-surface-strong px-3 py-1.5 text-xs">
                <span className="font-semibold">{displayName(c.author)}</span>
                <span className="ml-1 text-foreground/40">{fmtDate(c.createdAt)}</span>
                <p className="mt-0.5 text-foreground/80">{c.content}</p>
              </div>
            </div>
          ))}

          {myId && (
            <form onSubmit={handleComment} className="flex gap-2 pt-1">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Responder..."
                className="flex-1 rounded-xl border border-line bg-background px-3 py-1.5 text-xs outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={!text.trim() || sending}
                className="rounded-xl bg-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
              >
                {sending ? "..." : "Enviar"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

type TeamWallProps = {
  /** Si es coach, puede crear posts y pin */
  isCoach?: boolean;
};

export function TeamWall({ isCoach = false }: TeamWallProps) {
  const { data: session } = useSession();
  const myId = session?.user?.id;
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [posting, setPosting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPosts = useCallback(async () => {
    const res = await fetch("/api/team-posts");
    if (res.ok) {
      const data: Post[] = await res.json();
      setPosts(data);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    pollingRef.current = setInterval(fetchPosts, 8000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [fetchPosts]);

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!newText.trim()) return;
    setPosting(true);
    const res = await fetch("/api/team-posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newText.trim(), isPinned }),
    });
    if (res.ok) {
      const post: Post = await res.json();
      setPosts((prev) => isPinned ? [post, ...prev] : [post, ...prev]);
      setNewText("");
      setIsPinned(false);
      setShowForm(false);
    }
    setPosting(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este post?")) return;
    const res = await fetch(`/api/team-posts/${id}`, { method: "DELETE" });
    if (res.ok) setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="space-y-4">
      {/* Compose */}
      {(isCoach || myId) && (
        <div>
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full rounded-3xl border border-dashed border-line px-5 py-3 text-left text-sm text-foreground/40 transition hover:border-accent/40 hover:text-foreground/70"
            >
              + Escribe algo para el equipo...
            </button>
          ) : (
            <form onSubmit={handlePost} className="rounded-3xl border border-line bg-surface p-4 space-y-3">
              <textarea
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                rows={3}
                placeholder="Motivación, aviso, logro del equipo..."
                className="w-full resize-none rounded-xl border border-line bg-surface-strong px-3 py-2.5 text-sm outline-none focus:border-accent"
                autoFocus
              />
              <div className="flex items-center gap-4">
                {isCoach && (
                  <label className="flex items-center gap-2 text-xs text-foreground/60 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPinned}
                      onChange={(e) => setIsPinned(e.target.checked)}
                      className="accent-accent"
                    />
                    Fijar al top
                  </label>
                )}
                <div className="ml-auto flex gap-2">
                  <button type="button" onClick={() => setShowForm(false)} className="rounded-full border border-line px-4 py-1.5 text-xs text-foreground/60 hover:bg-surface-strong">
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!newText.trim() || posting}
                    className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40 hover:bg-accent-strong"
                  >
                    {posting ? "Publicando..." : "Publicar"}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Feed */}
      {loading ? (
        <p className="text-center text-sm text-foreground/40">Cargando...</p>
      ) : posts.length === 0 ? (
        <p className="text-center text-sm text-foreground/40">El muro está vacío. Publica algo para el equipo.</p>
      ) : (
        posts.map((post) => (
          <article key={post.id} className={`rounded-3xl border bg-surface overflow-hidden ${post.isPinned ? "border-accent/30" : "border-line"}`}>
            {post.isPinned && (
              <div className="border-b border-accent/20 bg-accent/5 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-accent/70">
                Fijado
              </div>
            )}
            <div className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                    {initials(post.author)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-none">{displayName(post.author)}</p>
                    <p className="mt-0.5 text-[10px] text-foreground/40">{roleLabel(post.author.role)} · {fmtDate(post.createdAt)}</p>
                  </div>
                </div>
                {(post.authorId === myId || isCoach) && (
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="shrink-0 rounded-lg border border-line px-2 py-1 text-[10px] text-danger/50 hover:border-danger/30 hover:text-danger transition"
                  >
                    Eliminar
                  </button>
                )}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-foreground/85 whitespace-pre-wrap">{post.content}</p>
            </div>
            <CommentList postId={post.id} comments={post.comments} myId={myId} />
          </article>
        ))
      )}
    </div>
  );
}
