"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ── Poses predefinidas con IDs de YouTube curados ────────────────────────────
const PRESET_POSES = [
  { label: "Front Double Bicep",   search: "bodybuilding front double bicep pose tutorial" },
  { label: "Back Double Bicep",    search: "bodybuilding back double bicep pose tutorial" },
  { label: "Side Chest",           search: "bodybuilding side chest pose tutorial" },
  { label: "Front Lat Spread",     search: "bodybuilding front lat spread tutorial" },
  { label: "Back Lat Spread",      search: "bodybuilding back lat spread tutorial" },
  { label: "Side Tricep",          search: "bodybuilding side tricep pose tutorial" },
  { label: "Most Muscular",        search: "bodybuilding most muscular crab pose tutorial" },
  { label: "Abdominals & Thighs",  search: "bodybuilding abdominals thighs pose tutorial" },
  { label: "Vacuum",               search: "bodybuilding vacuum pose tutorial technique" },
  { label: "Posing flow rutina",   search: "bodybuilding posing routine flow beginner" },
];

const COLORS = ["#f87171", "#fb923c", "#fbbf24", "#34d399", "#38bdf8", "#818cf8", "#e879f9", "#ffffff", "#000000"];
const LINE_WIDTHS = [2, 4, 8, 14];

function extractYoutubeId(input: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#\s]+)/,
  ];
  for (const p of patterns) {
    const m = input.match(p);
    if (m) return m[1];
  }
  // Si es solo un ID (11 chars alfanumérico)
  if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) return input.trim();
  return null;
}

function buildEmbedUrl(videoId: string) {
  return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0&modestbranding=1`;
}

function buildSearchEmbedUrl(query: string) {
  return `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(query)}&rel=0&modestbranding=1`;
}

type DrawMode = "pen" | "eraser";
type RecordingState = "idle" | "recording" | "done";

type Annotation = {
  id: string;
  name: string;
  timestamp: string;
  blob: Blob;
  url: string;
};

export default function PosingLabPage() {
  // Video state
  const [videoId, setVideoId]   = useState<string | null>(null);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<number | null>(null);

  // Draw state
  const [drawMode, setDrawMode]     = useState<DrawMode>("pen");
  const [drawActive, setDrawActive] = useState(false);
  const [color, setColor]           = useState(COLORS[0]);
  const [lineWidth, setLineWidth]   = useState(LINE_WIDTHS[1]);
  const isDrawing = useRef(false);

  // Canvas refs
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const containerRef   = useRef<HTMLDivElement>(null);
  const lastPos        = useRef<{ x: number; y: number } | null>(null);

  // Recording state
  const [recState, setRecState]           = useState<RecordingState>("idle");
  const [recSeconds, setRecSeconds]       = useState(0);
  const mediaRecorderRef                  = useRef<MediaRecorder | null>(null);
  const recChunks                         = useRef<Blob[]>([]);
  const recTimerRef                       = useRef<ReturnType<typeof setInterval> | null>(null);
  const [annotations, setAnnotations]     = useState<Annotation[]>([]);
  const [recName, setRecName]             = useState("");
  const pendingBlobRef                    = useRef<Blob | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);

  // ── Canvas resize ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ro = new ResizeObserver(() => {
      const { width, height } = container.getBoundingClientRect();
      // Guardar imagen antes de resize
      const ctx = canvas.getContext("2d");
      const img = ctx?.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width  = width;
      canvas.height = height;
      if (img) ctx?.putImageData(img, 0, 0);
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // ── Drawing helpers ────────────────────────────────────────────────────────
  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawActive) return;
    isDrawing.current = true;
    lastPos.current = getPos(e);
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
  }, [drawActive]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawActive || !isDrawing.current || !lastPos.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineWidth   = drawMode === "eraser" ? lineWidth * 4 : lineWidth;
    ctx.strokeStyle = drawMode === "eraser" ? "rgba(0,0,0,1)" : color;
    ctx.globalCompositeOperation = drawMode === "eraser" ? "destination-out" : "source-over";
    ctx.lineCap  = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  }, [drawActive, drawMode, color, lineWidth]);

  const onPointerUp = useCallback(() => {
    isDrawing.current = false;
    lastPos.current = null;
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) ctx.globalCompositeOperation = "source-over";
    }
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const exportImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `posing-annotation-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  // ── Voice recording ────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recChunks.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) recChunks.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(recChunks.current, { type: "audio/webm" });
        pendingBlobRef.current = blob;
        setShowNameModal(true);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecSeconds(0);
      setRecState("recording");
      recTimerRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    } catch {
      alert("No se pudo acceder al micrófono. Revisa los permisos del navegador.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    setRecState("done");
  };

  const saveAnnotation = () => {
    const blob = pendingBlobRef.current;
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const name = recName.trim() || `Nota ${annotations.length + 1}`;
    const ts = new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    setAnnotations((prev) => [...prev, { id: Date.now().toString(), name, timestamp: ts, blob, url }]);
    setRecName("");
    setShowNameModal(false);
    pendingBlobRef.current = null;
    setRecState("idle");
  };

  const downloadAudio = (a: Annotation) => {
    const link = document.createElement("a");
    link.download = `${a.name.replace(/\s+/g, "-")}.webm`;
    link.href = a.url;
    link.click();
  };

  const deleteAnnotation = (id: string) => {
    setAnnotations((prev) => {
      const found = prev.find((a) => a.id === id);
      if (found) URL.revokeObjectURL(found.url);
      return prev.filter((a) => a.id !== id);
    });
  };

  // ── Video handlers ─────────────────────────────────────────────────────────
  const loadPreset = (idx: number) => {
    setActivePreset(idx);
    setEmbedUrl(buildSearchEmbedUrl(PRESET_POSES[idx].search));
    setVideoId(null);
    setUrlInput("");
    setUrlError(null);
    clearCanvas();
  };

  const loadUrl = () => {
    const id = extractYoutubeId(urlInput.trim());
    if (!id) {
      setUrlError("URL o ID de YouTube no reconocido");
      return;
    }
    setVideoId(id);
    setEmbedUrl(buildEmbedUrl(id));
    setActivePreset(null);
    setUrlError(null);
    clearCanvas();
  };

  const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <main className="min-h-screen bg-background px-4 pb-10 pt-6">
      <div className="mx-auto max-w-[1480px] space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎬</span>
          <div>
            <h1 className="text-xl font-bold">Posing Lab</h1>
            <p className="text-xs text-foreground/45">Analiza, dibuja y anota vídeos de posing para tu atleta</p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[280px_1fr_260px]">

          {/* ── Sidebar izq: presets + URL ─────────────────────────────────── */}
          <aside className="space-y-4">
            {/* URL personalizada */}
            <div className="rounded-2xl border border-line bg-surface p-4 space-y-2">
              <p className="text-xs uppercase tracking-widest text-foreground/45">URL de YouTube</p>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => { setUrlInput(e.target.value); setUrlError(null); }}
                onKeyDown={(e) => e.key === "Enter" && loadUrl()}
                placeholder="Pega URL o ID del vídeo"
                className="w-full rounded-xl border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              />
              {urlError && <p className="text-xs text-danger">{urlError}</p>}
              <button
                onClick={loadUrl}
                className="w-full rounded-xl bg-accent py-2 text-xs font-semibold text-white hover:bg-accent-strong transition"
              >
                Cargar vídeo
              </button>
            </div>

            {/* Poses predefinidas */}
            <div className="rounded-2xl border border-line bg-surface p-4 space-y-2">
              <p className="text-xs uppercase tracking-widest text-foreground/45">Poses estándar</p>
              <div className="space-y-1">
                {PRESET_POSES.map((pose, i) => (
                  <button
                    key={i}
                    onClick={() => loadPreset(i)}
                    className={`w-full rounded-xl px-3 py-2 text-left text-xs transition ${
                      activePreset === i
                        ? "bg-accent/15 text-accent font-semibold"
                        : "text-foreground/65 hover:bg-surface-strong hover:text-foreground"
                    }`}
                  >
                    {pose.label}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* ── Área de vídeo + canvas ─────────────────────────────────────── */}
          <div className="space-y-3">
            {/* Video + Canvas */}
            <div
              ref={containerRef}
              className="relative w-full overflow-hidden rounded-2xl border border-line bg-black"
              style={{ aspectRatio: "16/9" }}
            >
              {embedUrl ? (
                <>
                  {/* Bloquea interacción con el iframe cuando se dibuja */}
                  {drawActive && (
                    <div className="absolute inset-0 z-10" style={{ pointerEvents: "none" }} />
                  )}
                  <iframe
                    src={embedUrl}
                    title="Posing video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full"
                    style={{ pointerEvents: drawActive ? "none" : "auto" }}
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 z-20 h-full w-full"
                    style={{
                      pointerEvents: drawActive ? "auto" : "none",
                      cursor: drawActive
                        ? drawMode === "eraser" ? "cell" : "crosshair"
                        : "default",
                    }}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerLeave={onPointerUp}
                  />
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-center text-foreground/30 p-8">
                  <div>
                    <p className="text-4xl mb-3">🎬</p>
                    <p className="text-sm font-medium">Selecciona una pose o pega una URL</p>
                    <p className="text-xs mt-1 text-foreground/25">El vídeo de YouTube se cargará aquí</p>
                  </div>
                </div>
              )}
            </div>

            {/* Toolbar de dibujo */}
            <div className="rounded-2xl border border-line bg-surface p-3 flex flex-wrap items-center gap-3">
              {/* Toggle draw mode */}
              <button
                onClick={() => setDrawActive((v) => !v)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  drawActive
                    ? "bg-accent text-white shadow-[0_0_12px_var(--accent-glow)]"
                    : "border border-line text-foreground/60 hover:text-foreground"
                }`}
              >
                ✏️ {drawActive ? "Dibujando" : "Dibujar"}
              </button>

              {/* Pen / Eraser */}
              <div className="flex rounded-xl border border-line overflow-hidden">
                {(["pen", "eraser"] as DrawMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setDrawMode(m)}
                    disabled={!drawActive}
                    className={`px-3 py-1.5 text-xs transition disabled:opacity-30 ${
                      drawMode === m && drawActive
                        ? "bg-accent/20 text-accent font-semibold"
                        : "text-foreground/55 hover:text-foreground"
                    }`}
                  >
                    {m === "pen" ? "🖊 Lápiz" : "🧹 Borrador"}
                  </button>
                ))}
              </div>

              {/* Colores */}
              <div className="flex items-center gap-1">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => { setColor(c); setDrawMode("pen"); }}
                    disabled={!drawActive}
                    title={c}
                    className={`h-5 w-5 rounded-full border-2 transition disabled:opacity-30 ${
                      color === c && drawMode === "pen" ? "border-white scale-125" : "border-transparent hover:scale-110"
                    }`}
                    style={{ background: c }}
                  />
                ))}
              </div>

              {/* Grosor */}
              <div className="flex items-center gap-1">
                {LINE_WIDTHS.map((w) => (
                  <button
                    key={w}
                    onClick={() => setLineWidth(w)}
                    disabled={!drawActive}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg transition disabled:opacity-30 ${
                      lineWidth === w ? "bg-accent/20" : "hover:bg-surface-strong"
                    }`}
                  >
                    <span
                      className="rounded-full bg-foreground"
                      style={{ width: Math.min(w * 2, 20), height: Math.min(w * 2, 20) }}
                    />
                  </button>
                ))}
              </div>

              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={clearCanvas}
                  className="rounded-xl border border-line px-3 py-1.5 text-xs text-foreground/55 hover:text-foreground transition"
                >
                  🗑 Limpiar
                </button>
                <button
                  onClick={exportImage}
                  disabled={!embedUrl}
                  className="rounded-xl border border-line px-3 py-1.5 text-xs text-foreground/55 hover:text-foreground transition disabled:opacity-30"
                >
                  📥 Exportar PNG
                </button>
              </div>
            </div>
          </div>

          {/* ── Sidebar der: grabación de voz ─────────────────────────────── */}
          <aside className="space-y-4">
            {/* Grabadora */}
            <div className="rounded-2xl border border-line bg-surface p-4 space-y-3">
              <p className="text-xs uppercase tracking-widest text-foreground/45">Anotación de voz</p>

              {recState === "idle" && (
                <button
                  onClick={startRecording}
                  className="w-full rounded-xl bg-danger/90 py-3 text-sm font-semibold text-white hover:bg-danger transition flex items-center justify-center gap-2"
                >
                  <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                  Grabar
                </button>
              )}

              {recState === "recording" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-xl bg-danger/10 border border-danger/30 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-danger animate-pulse" />
                      <span className="text-xs font-semibold text-danger">REC</span>
                    </div>
                    <span className="font-mono text-sm font-bold text-danger">{fmtTime(recSeconds)}</span>
                  </div>
                  <button
                    onClick={stopRecording}
                    className="w-full rounded-xl border border-line py-2.5 text-sm font-semibold transition hover:bg-surface-strong"
                  >
                    ⏹ Detener
                  </button>
                </div>
              )}

              {recState === "done" && (
                <div className="rounded-xl border border-line bg-surface-strong px-3 py-2 text-xs text-foreground/55 text-center">
                  Guardando anotación…
                </div>
              )}

              <p className="text-[10px] text-foreground/35 leading-tight">
                Graba tu feedback en voz mientras ves el vídeo. Se guarda en el navegador y puedes descargarlo.
              </p>
            </div>

            {/* Lista de anotaciones */}
            {annotations.length > 0 && (
              <div className="rounded-2xl border border-line bg-surface p-4 space-y-2">
                <p className="text-xs uppercase tracking-widest text-foreground/45">Grabaciones</p>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {annotations.map((a) => (
                    <div key={a.id} className="rounded-xl border border-line/60 bg-background/50 p-2.5 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium text-foreground leading-tight">{a.name}</p>
                        <span className="text-[10px] text-foreground/35 shrink-0">{a.timestamp}</span>
                      </div>
                      <audio controls src={a.url} className="w-full h-7" />
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => downloadAudio(a)}
                          className="flex-1 rounded-lg border border-line py-1 text-[10px] text-foreground/55 hover:text-foreground transition"
                        >
                          ↓ Descargar
                        </button>
                        <button
                          onClick={() => deleteAnnotation(a.id)}
                          className="rounded-lg border border-danger/30 px-2 py-1 text-[10px] text-danger/70 hover:text-danger transition"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tips */}
            <div className="rounded-2xl border border-line/40 bg-background/30 p-4 space-y-2">
              <p className="text-xs uppercase tracking-widest text-foreground/35">Flujo recomendado</p>
              <ol className="space-y-1.5 text-[11px] text-foreground/50 list-decimal list-inside">
                <li>Carga un vídeo de referencia</li>
                <li>Activa <strong className="text-foreground/70">Dibujar</strong> y marca puntos de mejora</li>
                <li>Pulsa <strong className="text-foreground/70">Grabar</strong> y explica con voz</li>
                <li>Descarga el PNG + el audio para enviarlos al atleta</li>
              </ol>
            </div>
          </aside>

        </div>
      </div>

      {/* Modal: nombre de la grabación */}
      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowNameModal(false)}>
          <div
            className="w-full max-w-sm rounded-3xl border border-line bg-surface p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <p className="text-xs uppercase tracking-widest text-foreground/40">Grabación lista</p>
              <h3 className="mt-1 text-lg font-bold">Dar nombre a la nota</h3>
            </div>
            <input
              autoFocus
              type="text"
              value={recName}
              onChange={(e) => setRecName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveAnnotation()}
              placeholder={`Nota ${annotations.length + 1}`}
              className="w-full rounded-2xl border border-line bg-surface-strong px-4 py-3 text-sm outline-none focus:border-accent"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowNameModal(false); setRecState("idle"); pendingBlobRef.current = null; }}
                className="flex-1 rounded-xl border border-line py-2 text-sm text-foreground/55 hover:text-foreground transition"
              >
                Descartar
              </button>
              <button
                onClick={saveAnnotation}
                className="flex-1 rounded-xl bg-accent py-2 text-sm font-semibold text-white hover:bg-accent-strong transition"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
