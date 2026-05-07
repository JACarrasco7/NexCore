"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

// ── Types ──────────────────────────────────────────────────────────────────────

type Role = "COACH" | "ATHLETE";
type GoalKey = "VOLUMEN" | "DEFINICION" | "MANTENIMIENTO" | "PEAK_WEEK";

const GOAL_OPTIONS: { value: GoalKey; label: string; desc: string }[] = [
  { value: "VOLUMEN", label: "Volumen / Masa", desc: "Ganar músculo y fuerza" },
  { value: "DEFINICION", label: "Definición", desc: "Perder grasa manteniendo músculo" },
  { value: "MANTENIMIENTO", label: "Mantenimiento", desc: "Mantener composición actual" },
  { value: "PEAK_WEEK", label: "Peak Week", desc: "Puesta a punto para competición" },
];

// ── Step indicators ───────────────────────────────────────────────────────────

function Steps({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i < current
              ? "w-8 bg-accent"
              : i === current
              ? "w-8 bg-accent/70"
              : "w-4 bg-line"
          }`}
        />
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [role, setRole] = useState<Role>("COACH");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Coach fields
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [specialty, setSpecialty] = useState("");

  // Athlete fields
  const [fullName, setFullName] = useState("");
  const [goal, setGoal] = useState<GoalKey>("VOLUMEN");
  const [coachEmail, setCoachEmail] = useState("");
  const [weightKg, setWeightKg] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) { router.replace("/login"); return; }
    const r = (session.user as { role?: string }).role as Role | undefined;
    if (r === "ATHLETE") setRole("ATHLETE");
    else setRole("COACH");
    setDisplayName(session.user.name ?? "");
    setFullName(session.user.name ?? "");
  }, [session, status, router]);

  // ── Step content ───────────────────────────────────────────────────────────

  const totalSteps = 3;

  async function readErrorMessage(res: Response, fallback: string) {
    const text = await res.text();
    if (!text) return fallback;
    try {
      const parsed = JSON.parse(text) as { error?: string };
      return parsed.error ?? fallback;
    } catch {
      return fallback;
    }
  }

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      if (role === "COACH") {
        const res = await fetch("/api/onboarding/coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ displayName, bio, specialty }),
        });
        if (!res.ok) {
          const msg = await readErrorMessage(res, "Error al guardar perfil");
          setError(msg);
          return;
        }
      } else {
        const res = await fetch("/api/onboarding/athlete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullName, goal, coachEmail, weightKg: weightKg ? Number(weightKg) : undefined }),
        });
        if (!res.ok) {
          const msg = await readErrorMessage(res, "Error al guardar perfil");
          setError(msg);
          return;
        }
      }
      setDone(true);
      setStep(totalSteps);
    } finally {
      setLoading(false);
    }
  }

  function goToDashboard() {
    router.push(role === "COACH" ? "/coach" : "/athlete/plan");
  }

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-10 flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-linear-to-br from-accent to-accent-strong text-lg font-bold text-white shadow-[0_8px_24px_var(--accent-glow)]">
            AC
          </span>
          <p className="text-sm text-foreground/50">
            {done ? "¡Todo listo!" : `Paso ${step + 1} de ${totalSteps}`}
          </p>
          <Steps current={step} total={totalSteps} />
        </div>

        <div className="rounded-3xl border border-line bg-surface p-8 shadow-[0_8px_40px_var(--accent-glow)]">
          {/* ── STEP 0: Bienvenida ── */}
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold">Bienvenido a Apex Coach OS</h1>
                <p className="mt-2 text-sm text-foreground/60">
                  Configuremos tu cuenta en menos de 2 minutos.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Tu rol</p>
                <div className="grid grid-cols-2 gap-3">
                  {(["COACH", "ATHLETE"] as Role[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRole(r)}
                      className={`flex flex-col items-center gap-2 rounded-2xl border p-5 transition ${
                        role === r
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-line bg-surface-strong text-foreground/60 hover:border-accent/40"
                      }`}
                    >
                      <span className="text-3xl">{r === "COACH" ? "🏋️" : "⚡"}</span>
                      <span className="text-sm font-semibold">
                        {r === "COACH" ? "Entrenador" : "Atleta"}
                      </span>
                      <span className="text-xs text-foreground/40 text-center">
                        {r === "COACH"
                          ? "Gestiona atletas y planes"
                          : "Sigue tu progreso"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setStep(1)}
                className="w-full rounded-2xl bg-linear-to-r from-accent to-accent-strong py-3 text-sm font-semibold text-white shadow-[0_4px_16px_var(--accent-glow)] transition hover:brightness-110"
              >
                Continuar →
              </button>
            </div>
          )}

          {/* ── STEP 1: Datos de perfil ── */}
          {step === 1 && role === "COACH" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold">Tu perfil de entrenador</h2>
                <p className="mt-1 text-sm text-foreground/55">Así te verán tus atletas.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nombre profesional *</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ej: Carlos García"
                  className="w-full rounded-2xl border border-line bg-surface-strong px-4 py-3 text-sm outline-none transition focus:border-accent"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Especialidad</label>
                <input
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="Ej: Culturismo natural, Powerlifting…"
                  className="w-full rounded-2xl border border-line bg-surface-strong px-4 py-3 text-sm outline-none transition focus:border-accent"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Bio (opcional)</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder="Cuéntanos sobre tu experiencia…"
                  className="w-full resize-none rounded-2xl border border-line bg-surface-strong px-4 py-3 text-sm outline-none transition focus:border-accent"
                />
              </div>
              {error && (
                <p className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                  {error}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(0)}
                  className="flex-1 rounded-2xl border border-line py-3 text-sm text-foreground/60 hover:text-foreground transition"
                >
                  ← Atrás
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!displayName.trim()}
                  className="flex-1 rounded-2xl bg-linear-to-r from-accent to-accent-strong py-3 text-sm font-semibold text-white shadow-[0_4px_16px_var(--accent-glow)] transition hover:brightness-110 disabled:opacity-40"
                >
                  Continuar →
                </button>
              </div>
            </div>
          )}

          {step === 1 && role === "ATHLETE" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold">Tu perfil de atleta</h2>
                <p className="mt-1 text-sm text-foreground/55">Tu entrenador usará estos datos.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tu nombre completo *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nombre y apellido"
                  className="w-full rounded-2xl border border-line bg-surface-strong px-4 py-3 text-sm outline-none transition focus:border-accent"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Peso actual (kg)</label>
                <input
                  type="number"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="75"
                  min={30}
                  max={300}
                  className="w-full rounded-2xl border border-line bg-surface-strong px-4 py-3 text-sm outline-none transition focus:border-accent"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Objetivo principal</label>
                <div className="grid grid-cols-2 gap-2">
                  {GOAL_OPTIONS.map((g) => (
                    <button
                      key={g.value}
                      onClick={() => setGoal(g.value)}
                      className={`rounded-2xl border p-3 text-left transition ${
                        goal === g.value
                          ? "border-accent bg-accent/10"
                          : "border-line bg-surface-strong hover:border-accent/40"
                      }`}
                    >
                      <p className={`text-xs font-semibold ${goal === g.value ? "text-accent" : "text-foreground"}`}>
                        {g.label}
                      </p>
                      <p className="text-xs text-foreground/45 mt-0.5">{g.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(0)}
                  className="flex-1 rounded-2xl border border-line py-3 text-sm text-foreground/60 hover:text-foreground transition"
                >
                  ← Atrás
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!fullName.trim()}
                  className="flex-1 rounded-2xl bg-linear-to-r from-accent to-accent-strong py-3 text-sm font-semibold text-white shadow-[0_4px_16px_var(--accent-glow)] transition hover:brightness-110 disabled:opacity-40"
                >
                  Continuar →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Confirmación / Coach email (atleta) ── */}
          {step === 2 && role === "COACH" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold">¡Todo listo para empezar!</h2>
                <p className="mt-1 text-sm text-foreground/55">Revisa tu información.</p>
              </div>
              <div className="space-y-3 rounded-2xl border border-line bg-surface-strong p-4">
                <div>
                  <p className="text-xs text-foreground/40 uppercase tracking-widest">Nombre</p>
                  <p className="font-semibold">{displayName}</p>
                </div>
                {specialty && (
                  <div>
                    <p className="text-xs text-foreground/40 uppercase tracking-widest">Especialidad</p>
                    <p className="text-sm">{specialty}</p>
                  </div>
                )}
                {bio && (
                  <div>
                    <p className="text-xs text-foreground/40 uppercase tracking-widest">Bio</p>
                    <p className="text-sm text-foreground/70">{bio}</p>
                  </div>
                )}
              </div>
              {error && (
                <p className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                  {error}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-2xl border border-line py-3 text-sm text-foreground/60 hover:text-foreground transition"
                >
                  ← Atrás
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 rounded-2xl bg-linear-to-r from-accent to-accent-strong py-3 text-sm font-semibold text-white shadow-[0_4px_16px_var(--accent-glow)] transition hover:brightness-110 disabled:opacity-40"
                >
                  {loading ? "Guardando…" : "Guardar y entrar →"}
                </button>
              </div>
            </div>
          )}

          {step === 2 && role === "ATHLETE" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold">Conectar con tu entrenador</h2>
                <p className="mt-1 text-sm text-foreground/55">
                  Introduce el email con el que tu coach se registró en Apex.
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email del entrenador *</label>
                <input
                  type="email"
                  value={coachEmail}
                  onChange={(e) => setCoachEmail(e.target.value)}
                  placeholder="coach@ejemplo.com"
                  className="w-full rounded-2xl border border-line bg-surface-strong px-4 py-3 text-sm outline-none transition focus:border-accent"
                />
                <p className="text-xs text-foreground/40">
                  Tu entrenador debe tener una cuenta activa en Apex Coach OS.
                </p>
              </div>
              <div className="rounded-2xl border border-line bg-surface-strong p-4 space-y-2">
                <p className="text-xs text-foreground/40 uppercase tracking-widest">Resumen</p>
                <p className="text-sm"><span className="text-foreground/50">Nombre:</span> {fullName}</p>
                <p className="text-sm"><span className="text-foreground/50">Objetivo:</span> {GOAL_OPTIONS.find((g) => g.value === goal)?.label}</p>
                {weightKg && <p className="text-sm"><span className="text-foreground/50">Peso:</span> {weightKg} kg</p>}
              </div>
              {error && (
                <p className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                  {error}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-2xl border border-line py-3 text-sm text-foreground/60 hover:text-foreground transition"
                >
                  ← Atrás
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !coachEmail.trim()}
                  className="flex-1 rounded-2xl bg-linear-to-r from-accent to-accent-strong py-3 text-sm font-semibold text-white shadow-[0_4px_16px_var(--accent-glow)] transition hover:brightness-110 disabled:opacity-40"
                >
                  {loading ? "Conectando…" : "Unirme →"}
                </button>
              </div>
            </div>
          )}

          {/* ── DONE ── */}
          {done && step === totalSteps && (
            <div className="space-y-6 text-center">
              <div className="flex flex-col items-center gap-4">
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/15 text-4xl">
                  🎉
                </span>
                <div>
                  <h2 className="text-2xl font-bold">
                    {role === "COACH" ? `¡Listo, ${displayName}!` : `¡Bienvenido, ${fullName}!`}
                  </h2>
                  <p className="mt-2 text-sm text-foreground/55">
                    {role === "COACH"
                      ? "Tu cuenta de entrenador está configurada. Empieza añadiendo atletas."
                      : "Tu perfil está listo. Tu entrenador ya puede verte en su dashboard."}
                  </p>
                </div>
              </div>
              <button
                onClick={goToDashboard}
                className="w-full rounded-2xl bg-linear-to-r from-accent to-accent-strong py-3.5 text-sm font-semibold text-white shadow-[0_4px_16px_var(--accent-glow)] transition hover:brightness-110"
              >
                {role === "COACH" ? "Ir al Dashboard →" : "Ver mi Plan →"}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
