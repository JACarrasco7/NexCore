"use client"

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useToast } from '@/components/ui/toast'
import { apiFetch, apiPost } from '@/lib/store'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

type InviteData = {
  invitedEmail: string
  teamName: string
  role: 'ADMIN' | 'MEMBER'
  expiresAt: string
}

function AcceptInviteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const { pushToast } = useToast()

  const token = searchParams.get('token')

  const [inviteData, setInviteData] = useState<InviteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Si no autenticado, redirigir a login
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=/auth/accept-invite?token=${token}`)
    }
  }, [status, router, token])

  // Cargar datos de la invitación
  useEffect(() => {
    if (!token || status !== 'authenticated') return

    async function loadInvite() {
      try {
        const data = await apiFetch<InviteData>(`/api/teams/invites/${token}/preview`)
        setInviteData(data)
      } catch (err) {
        setError('Invitación no válida')
      } finally {
        setLoading(false)
      }
    }

    void loadInvite()
  }, [token, status])

  async function handleAccept() {
    if (!token) return
    setAccepting(true)

    try {
      try {
        const result = await apiPost<{ team?: { name: string } }>(`/api/teams/invites/${token}`, {})
        pushToast({ title: `Bienvenido a ${result.team?.name || 'tu equipo'}`, variant: 'success' })
        router.push('/coach')
      } catch (err: any) {
        setError(err?.message ?? 'Error al aceptar')
        pushToast({ title: err?.message ?? 'Error al aceptar', variant: 'error' })
      }
    } finally {
      setAccepting(false)
    }
  }

  // Loading
  if (loading) {
    return (
      <main className="mx-auto w-full max-w-md px-6 py-20 text-center">
        <Skeleton className="mx-auto mb-6 h-8 w-32 rounded-lg" />
        <Skeleton className="mb-6 h-32 rounded-2xl" />
      </main>
    )
  }

  // Error o no autenticado
  if (!session?.user) {
    return (
      <main className="mx-auto w-full max-w-md px-6 py-20 text-center">
        <p className="text-foreground/50 mb-4">Debes iniciar sesión para aceptar la invitación</p>
        <Link
          href={`/login?callbackUrl=/auth/accept-invite?token=${token}`}
          className="bg-accent hover:bg-accent-strong rounded-full px-5 py-2.5 text-sm font-semibold text-white transition"
        >
          Ir a login
        </Link>
      </main>
    )
  }

  // Error en invitación
  if (error) {
    return (
      <main className="mx-auto w-full max-w-md px-6 py-20 text-center">
        <div className="border-danger/30 bg-danger/5 rounded-2xl border p-6">
          <p className="text-danger mb-2 text-sm font-semibold">Error</p>
          <p className="text-foreground/60 text-sm">{error}</p>
          <Link
            href="/coach"
            className="border-line text-foreground/70 hover:text-foreground mt-4 inline-block rounded-full border px-5 py-2.5 text-sm font-medium transition"
          >
            Volver a Dashboard
          </Link>
        </div>
      </main>
    )
  }

  // Sin datos
  if (!inviteData) {
    return (
      <main className="mx-auto w-full max-w-md px-6 py-20 text-center">
        <p className="text-foreground/50">Invitación no encontrada</p>
      </main>
    )
  }

  const daysToExpire = Math.ceil(
    (new Date(inviteData.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
  )
  const isExpiring = daysToExpire <= 1

  return (
    <main className="mx-auto w-full max-w-md px-6 py-20">
      <div className="border-line bg-surface rounded-2xl border p-8">
        <h1 className="mb-2 text-2xl font-bold">¡Bienvenido!</h1>
        <p className="text-foreground/60 mb-6">Se te ha invitado a unirte a un equipo CARRIX</p>

        <div className="mb-6 space-y-4">
          <div className="border-line bg-surface-strong rounded-xl border p-4">
            <p className="text-foreground/45 mb-1 text-xs tracking-widest uppercase">Equipo</p>
            <p className="text-lg font-semibold">{inviteData.teamName}</p>
          </div>

          <div className="border-line bg-surface-strong rounded-xl border p-4">
            <p className="text-foreground/45 mb-1 text-xs tracking-widest uppercase">Tu rol</p>
            <p className="text-lg font-semibold">
              {inviteData.role === 'ADMIN' ? 'Administrador' : 'Miembro'}
            </p>
          </div>

          <div className="border-line bg-surface-strong rounded-xl border p-4">
            <p className="text-foreground/45 mb-1 text-xs tracking-widest uppercase">
              Invitación enviada a
            </p>
            <p className="text-foreground/80 text-sm">{inviteData.invitedEmail}</p>
            {session.user.email !== inviteData.invitedEmail && (
              <p className="text-warning mt-2 text-xs">
                ⚠️ Tu email actual ({session.user.email}) no coincide con el de la invitación
              </p>
            )}
          </div>

          {isExpiring && (
            <div className="border-warning/30 bg-warning/5 rounded-xl border p-4">
              <p className="text-warning text-xs font-semibold">
                ⏰ Expira en {daysToExpire} día{daysToExpire !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={handleAccept}
          disabled={accepting}
          className="bg-accent hover:bg-accent-strong mb-3 w-full rounded-full px-5 py-3 text-sm font-semibold text-white transition disabled:opacity-50"
        >
          {accepting ? 'Aceptando...' : 'Aceptar invitación'}
        </button>

        <p className="text-foreground/50 text-center text-xs">Iniciado como {session.user.email}</p>
      </div>
    </main>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-md px-6 py-20 text-center">
          <Skeleton className="mx-auto mb-6 h-8 w-32 rounded-lg" />
          <Skeleton className="mb-6 h-32 rounded-2xl" />
        </main>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  )
}
