"use client";

import { Suspense, useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import TotpLoginModal from "@/components/totp-login-modal";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const next = searchParams.get("next") ?? "/coach";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showTotp, setShowTotp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Si ya está autenticado, redirigir
  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      // Si el usuario tiene TOTP habilitado y aún no fue verificado, abrir modal de TOTP
      if ((session.user as any).totpEnabled && !(session.user as any).totpVerified) {
        setShowTotp(true);
        return;
      }
      router.push(next);
    }
  }, [status, session, router, next]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      console.error("[Login Error]", res.error);
      setError("Email o contraseña incorrectos");
      return;
    }
    if (res?.ok) {
      // La redirección la maneja el efecto useEffect que espera la sesión
      return;
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-linear-to-br from-accent to-accent-strong text-lg font-bold text-white shadow-[0_8px_24px_var(--accent-glow)]">
              AC
            </span>
          </div>
          <h1 className="text-2xl font-bold">Apex Coach OS</h1>
          <p className="mt-1.5 text-sm text-foreground/55">Inicia sesión para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-line bg-surface p-7 shadow-[0_8px_40px_var(--accent-glow)]">
          {error && (
            <div role="alert" className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-line bg-surface-strong px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              placeholder="coach@ejemplo.com"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">Contraseña</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-line bg-surface-strong px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-linear-to-r from-accent to-accent-strong py-3 text-sm font-bold text-white shadow-[0_4px_16px_var(--accent-glow)] transition hover:opacity-90 hover:shadow-[0_6px_22px_var(--accent-glow)] disabled:opacity-50"
          >
            {loading ? "Iniciando sesión..." : "Iniciar sesión"}
          </button>
        </form>

        <TotpLoginModal open={showTotp} next={next} onClose={() => setShowTotp(false)} />

        <p className="mt-6 text-center text-sm text-foreground/55">
          ¿No tienes cuenta?{" "}
          <Link href="/register" className="font-semibold text-accent hover:underline">
            Registrarse
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
