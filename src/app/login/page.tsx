'use client'
export const dynamic = 'force-dynamic'

import { Suspense, useState, useEffect } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import TotpLoginModal from '@/components/totp-login-modal'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const next = searchParams.get('next') ?? '/coach'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showTotp, setShowTotp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Si ya está autenticado, redirigir
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      // Si el usuario tiene TOTP habilitado y aún no fue verificado, abrir modal de TOTP
      if ((session.user as any).totpEnabled && !(session.user as any).totpVerified) {
        setShowTotp(true)
        return
      }
      router.push(next)
    }
  }, [status, session, router, next])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await signIn('credentials', { email, password, redirect: false })
      if (!res) {
        setError('No se pudo conectar. Intenta de nuevo.')
        return
      }
      if (res.error) {
        setError('Email o contraseña incorrectos. Verifica los datos.')
        return
      }
      // res.ok → useEffect redirigirá cuando session esté disponible
    } catch {
      setError('Demasiados intentos o problema de conexión. Espera unos segundos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <span className="from-accent to-accent-strong flex h-14 w-14 items-center justify-center rounded-3xl bg-linear-to-br text-lg font-bold text-white shadow-[0_8px_24px_var(--accent-glow)]">
              NX
            </span>
          </div>
          <h1 className="text-2xl font-bold">NEXUM</h1>
          <p className="text-foreground/55 mt-1.5 text-sm">Inicia sesión para continuar</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="border-line bg-surface space-y-4 rounded-3xl border p-7 shadow-[0_8px_40px_var(--accent-glow)]"
        >
          {error && (
            <div
              role="status"
              className="border-warning/30 bg-warning/10 text-warning flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm"
            >
              <svg
                className="mt-px size-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3m0 3h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-line bg-surface-strong focus:border-accent focus:ring-accent/20 w-full rounded-2xl border px-4 py-3 text-sm transition outline-none focus:ring-2"
              placeholder="coach@ejemplo.com"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-line bg-surface-strong focus:border-accent focus:ring-accent/20 w-full rounded-2xl border px-4 py-3 text-sm transition outline-none focus:ring-2"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="from-accent to-accent-strong w-full rounded-full bg-linear-to-r py-3 text-sm font-bold text-white shadow-[0_4px_16px_var(--accent-glow)] transition hover:opacity-90 hover:shadow-[0_6px_22px_var(--accent-glow)] disabled:opacity-50"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        <TotpLoginModal open={showTotp} next={next} onClose={() => setShowTotp(false)} />

        <p className="text-foreground/55 mt-6 text-center text-sm">
          ¿No tienes cuenta?{' '}
          <Link href="/register" className="text-accent font-semibold hover:underline">
            Registrarse
          </Link>
        </p>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
