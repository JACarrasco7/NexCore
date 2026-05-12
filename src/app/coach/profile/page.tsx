'use client'

import { useId, useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { SectionIntro } from '@/components/section-intro'
import { useToast } from '@/components/ui/toast'
import { Skeleton } from '@/components/ui/skeleton'

type CoachProfile = {
  id: string
  displayName: string
  phone: string | null
  phoneVerified: boolean
  bio: string | null
  email: string
  trialEndsAt: string
}

export default function CoachProfilePage() {
  const formId = useId()
  const { data: session } = useSession()
  const { pushToast } = useToast()

  const [profile, setProfile] = useState<CoachProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Edit form state
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)

  // Phone verification
  const [phone, setPhone] = useState('')
  const [showPhoneForm, setShowPhoneForm] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [verifyingPhone, setVerifyingPhone] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/me/coach')
        if (res.ok) {
          const data = (await res.json()) as CoachProfile
          setProfile(data)
          setDisplayName(data.displayName)
          setBio(data.bio || '')
          setPhone(data.phone || '')
        }
      } catch (err) {
        pushToast({ title: 'Error al cargar perfil', variant: 'error' })
      } finally {
        setLoading(false)
      }
    }

    void loadProfile()
  }, [pushToast])

  async function handleSaveProfile() {
    setSaving(true)
    try {
      const res = await fetch('/api/me/coach', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, bio }),
      })

      if (res.ok) {
        pushToast({
          title: 'Perfil actualizado',
          variant: 'success',
        })
        const updated = (await res.json()) as CoachProfile
        setProfile(updated)
      } else {
        const err = (await res.json()) as { error?: string }
        pushToast({
          title: err.error ?? 'Error al guardar',
          variant: 'error',
        })
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleSendOtp() {
    if (!phone) {
      pushToast({ title: 'Ingresa un número de teléfono', variant: 'error' })
      return
    }

    setVerifyingPhone(true)
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, type: 'VERIFICATION' }),
      })

      if (res.ok) {
        setOtpSent(true)
        pushToast({
          title: 'OTP enviado',
          description: 'Revisa tu teléfono',
          variant: 'success',
        })
      } else {
        const err = (await res.json()) as { error?: string }
        pushToast({
          title: err.error ?? 'Error al enviar OTP',
          variant: 'error',
        })
      }
    } finally {
      setVerifyingPhone(false)
    }
  }

  async function handleVerifyOtp() {
    if (!otp) {
      pushToast({ title: 'Ingresa el código OTP', variant: 'error' })
      return
    }

    setVerifyingPhone(true)
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otp, type: 'VERIFICATION', phone }),
      })

      if (res.ok) {
        pushToast({
          title: 'Teléfono verificado',
          variant: 'success',
        })
        setOtpSent(false)
        setOtp('')
        setShowPhoneForm(false)
        // Recargar perfil
        const profileRes = await fetch('/api/me/coach')
        if (profileRes.ok) {
          const updated = (await profileRes.json()) as CoachProfile
          setProfile(updated)
        }
      } else {
        const err = (await res.json()) as { error?: string }
        pushToast({
          title: err.error ?? 'Código inválido',
          variant: 'error',
        })
      }
    } finally {
      setVerifyingPhone(false)
    }
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-8 md:px-10">
        <Skeleton className="mb-6 h-8 w-48 rounded-lg" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      </main>
    )
  }

  if (!profile) {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-8 md:px-10">
        <p className="text-foreground/50">Error al cargar perfil</p>
      </main>
    )
  }

  const daysToExpiry = profile.trialEndsAt
    ? Math.floor((new Date(profile.trialEndsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    : null

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-6 py-8 md:px-10">
      <SectionIntro
        eyebrow="Configuración"
        title="Tu perfil"
        description="Información personal, contacto y verificación."
      />

      {/* Período de prueba */}
      {daysToExpiry !== null && daysToExpiry > 0 && (
        <div className="border-accent/30 bg-accent/5 rounded-2xl border p-5">
          <p className="text-sm font-medium">Período de prueba</p>
          <p className="text-accent mt-2 text-3xl font-bold">{daysToExpiry}</p>
          <p className="text-foreground/50 mt-0.5 text-xs">días restantes de acceso</p>
        </div>
      )}

      {/* Datos personales */}
      <article className="border-line bg-surface space-y-4 rounded-2xl border p-5">
        <h2 className="text-lg font-semibold">Datos personales</h2>

        <div className="space-y-1">
          <label htmlFor={`${formId}-name`} className="text-foreground/70 text-sm font-medium">
            Nombre (Coach)
          </label>
          <input
            id={`${formId}-name`}
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="border-line bg-surface-strong focus:border-accent w-full rounded-xl border px-3 py-2.5 text-sm transition outline-none"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor={`${formId}-bio`} className="text-foreground/70 text-sm font-medium">
            Bio / Especialidad
          </label>
          <textarea
            id={`${formId}-bio`}
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Ej: Coach de fuerza, especialista en powerlifting..."
            className="border-line bg-surface-strong focus:border-accent w-full resize-none rounded-xl border px-3 py-2.5 text-sm transition outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-foreground/70 text-sm font-medium">Email</label>
          <div className="border-line bg-surface-strong text-foreground/60 rounded-xl border px-3 py-2.5 text-sm">
            {profile.email}
          </div>
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={saving}
          className="bg-accent hover:bg-accent-strong rounded-full px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </article>

      {/* Verificación de teléfono */}
      <article className="border-line bg-surface space-y-4 rounded-2xl border p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Teléfono</h2>
            <p className="text-foreground/50 mt-1 text-xs">
              Para verificación de identidad y recuperación de cuenta
            </p>
          </div>
          {profile.phoneVerified && (
            <span className="bg-success/15 text-success rounded-full px-3 py-1 text-xs font-semibold">
              ✓ Verificado
            </span>
          )}
        </div>

        {!profile.phoneVerified ? (
          <>
            {!showPhoneForm ? (
              <button
                onClick={() => setShowPhoneForm(true)}
                className="border-line text-foreground/70 hover:border-accent/40 hover:text-accent rounded-full border px-4 py-2.5 text-sm font-semibold transition"
              >
                Agregar teléfono
              </button>
            ) : (
              <div className="space-y-3">
                {!otpSent ? (
                  <>
                    <div className="space-y-1">
                      <label
                        htmlFor={`${formId}-phone`}
                        className="text-foreground/70 text-sm font-medium"
                      >
                        Número de teléfono
                      </label>
                      <input
                        id={`${formId}-phone`}
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+34 6XX XXX XXX"
                        className="border-line bg-surface-strong focus:border-accent w-full rounded-xl border px-3 py-2.5 text-sm transition outline-none"
                      />
                    </div>
                    <button
                      onClick={handleSendOtp}
                      disabled={verifyingPhone || !phone}
                      className="bg-accent hover:bg-accent-strong rounded-full px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
                    >
                      {verifyingPhone ? 'Enviando...' : 'Enviar código'}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label
                        htmlFor={`${formId}-otp`}
                        className="text-foreground/70 text-sm font-medium"
                      >
                        Código OTP
                      </label>
                      <input
                        id={`${formId}-otp`}
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="000000"
                        maxLength={6}
                        className="border-line bg-surface-strong focus:border-accent w-full rounded-xl border px-3 py-2.5 font-mono text-sm transition outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleVerifyOtp}
                        disabled={verifyingPhone || !otp}
                        className="bg-success hover:bg-success/90 flex-1 rounded-full px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
                      >
                        {verifyingPhone ? 'Verificando...' : 'Verificar'}
                      </button>
                      <button
                        onClick={() => {
                          setOtpSent(false)
                          setOtp('')
                        }}
                        className="border-line text-foreground/70 hover:text-foreground rounded-full border px-4 py-2.5 text-sm font-medium transition"
                      >
                        Atrás
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="bg-success/10 text-success rounded-xl px-3 py-2.5 text-sm font-medium">
            ✓ {phone}
          </div>
        )}
      </article>

      {/* Links rápidos */}
      <article className="border-line bg-surface rounded-2xl border p-5">
        <h3 className="mb-3 font-semibold">Accesos rápidos</h3>
        <div className="space-y-2">
          <Link
            href="/coach/team"
            className="border-line hover:border-accent/40 flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition"
          >
            <span>Gestión del equipo</span>
            <span className="text-foreground/40">→</span>
          </Link>
          <Link
            href="/coach/settings"
            className="border-line hover:border-accent/40 flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition"
          >
            <span>Catálogo y configuración</span>
            <span className="text-foreground/40">→</span>
          </Link>
        </div>
      </article>
    </main>
  )
}
