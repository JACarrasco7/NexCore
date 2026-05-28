'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense } from 'react'
import { apiPost } from '@/lib/store'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, update: updateSession } = useSession()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function verify() {
      const token = searchParams.get('token')
      const email = searchParams.get('email')

      if (!token || !email) {
        setError('Enlace inválido: faltan parámetros')
        setLoading(false)
        return
      }

      try {
        try {
          await apiPost('/api/auth/verify-email', { token, email })
        } catch (err: any) {
          setError(err?.message ?? 'No se pudo verificar el email')
          setLoading(false)
          return
        }

        console.log('[verify-email] Email verificado, refrescando sesión...')

        // Refrescar la sesión JWT para que incluya emailVerified actualizado
        await updateSession()

        // Esperar a que se actualice la sesión
        await new Promise((r) => setTimeout(r, 1500))

        console.log('[verify-email] Sesión refrescada, redirigiendo a onboarding')
        setLoading(false)
        router.replace('/onboarding')
      } catch (err) {
        setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
        setLoading(false)
      }
    }

    verify()
  }, [searchParams, router, updateSession])

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="border-accent mb-4 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
          <p className="text-foreground/60">Verificando tu email...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="border-line bg-surface w-full max-w-sm rounded-3xl border p-8 text-center">
          <h1 className="text-xl font-bold">Error de verificación</h1>
          <p className="text-foreground/60 mt-2">{error}</p>
          <button
            onClick={() => router.replace('/onboarding')}
            className="from-accent to-accent-strong mt-6 w-full rounded-2xl bg-linear-to-r py-3 text-sm font-semibold text-white"
          >
            Ir a onboarding
          </button>
        </div>
      </main>
    )
  }

  return null
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  )
}
