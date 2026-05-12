'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

// ── Types ──────────────────────────────────────────────────────────────────────

type Role = 'COACH' | 'ATHLETE'
type GoalKey = 'VOLUMEN' | 'DEFINICION' | 'MANTENIMIENTO' | 'PEAK_WEEK'

const GOAL_OPTIONS: { value: GoalKey; label: string; desc: string }[] = [
  { value: 'VOLUMEN', label: 'Volumen / Masa', desc: 'Ganar músculo y fuerza' },
  { value: 'DEFINICION', label: 'Definición', desc: 'Perder grasa manteniendo músculo' },
  { value: 'MANTENIMIENTO', label: 'Mantenimiento', desc: 'Mantener composición actual' },
  { value: 'PEAK_WEEK', label: 'Peak Week', desc: 'Puesta a punto para competición' },
]

// ── Step indicators ───────────────────────────────────────────────────────────

function Steps({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i < current ? 'bg-accent w-8' : i === current ? 'bg-accent/70 w-8' : 'bg-line w-4'
          }`}
        />
      ))}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { data: session, status, update: updateSession } = useSession()
  const router = useRouter()

  const [step, setStep] = useState(-1) // -1 = Verificación, 0 = Bienvenida, 1+ = Datos
  const [role, setRole] = useState<Role>('COACH')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [emailVerified, setEmailVerified] = useState(false)

  // Coach fields
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [specialty, setSpecialty] = useState('')

  // Athlete fields
  const [fullName, setFullName] = useState('')
  const [goal, setGoal] = useState<GoalKey>('VOLUMEN')
  const [coachEmail, setCoachEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [verificationMethod, setVerificationMethod] = useState<'EMAIL' | 'SMS'>('EMAIL')

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user) {
      router.replace('/login')
      return
    }
    const emailVerif = Boolean((session.user as { emailVerified?: boolean | Date }).emailVerified)
    const phoneVerif = Boolean((session.user as { phoneVerified?: boolean }).phoneVerified)
    setEmailVerified(emailVerif)

    console.log('[onboarding] Status:', {
      emailVerified: emailVerif,
      phoneVerified: phoneVerif,
      role: (session.user as { role?: string }).role,
    })

    const r = (session.user as { role?: string }).role as Role | undefined
    if (r === 'ATHLETE') {
      setRole('ATHLETE')
      // Recuperar método de verificación del sessionStorage
      try {
        const saved = sessionStorage.getItem('athleteVerificationMethod')
        if (saved === 'SMS' || saved === 'EMAIL') {
          setVerificationMethod(saved)
        }
      } catch (e) {
        console.error('Error recuperando verificationMethod:', e)
      }
    } else {
      setRole('COACH')
    }

    // Lógica de Step -1: verificación de email O teléfono
    // Para ATHLETE + SMS: requiere SMS verification aunque email esté verificado
    // Para COACH: requiere email + SMS verification (en ese orden)
    // Para ATHLETE + EMAIL: requiere email verification

    const needsEmailVerif = !emailVerif
    const needsPhoneVerif =
      !phoneVerif && ((r === 'ATHLETE' && verificationMethod === 'SMS') || r === 'COACH')

    if (needsEmailVerif) {
      console.log('[onboarding] Email NO verificado, mostrando Step -1 (email)')
      setStep(-1)
    } else if (needsPhoneVerif) {
      console.log('[onboarding] Teléfono NO verificado, mostrando Step -1 (SMS)')
      setStep(-1)
    } else {
      console.log('[onboarding] Todo verificado, saltando a Step 0')
      setStep(0)
    }

    setDisplayName(session.user.name ?? '')
    setFullName(session.user.name ?? '')
  }, [session, status, router])

  // ── Step content ───────────────────────────────────────────────────────────

  const totalSteps = role === 'ATHLETE' && verificationMethod === 'SMS' ? 4 : 3 // Step 0: Verificación
  const displayedStep = step === -1 ? 0 : step + 1
  const displayedTotal = totalSteps + 1 // +1 para el step de verificación

  async function readErrorMessage(res: Response, fallback: string) {
    const text = await res.text()
    if (!text) return fallback
    try {
      const parsed = JSON.parse(text) as { error?: string }
      return parsed.error ?? fallback
    } catch {
      return fallback
    }
  }

  // ── Step 0: Verificación ──────────────────────────────────────────────────
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [verifyLoading, setVerifyLoading] = useState(false)

  async function handleSendOtp() {
    if (!phone?.trim()) {
      setError('Ingresa tu teléfono')
      return
    }
    setVerifyLoading(true)
    const purpose = role === 'ATHLETE' ? 'ATHLETE_VERIFICATION' : 'COACH_PHONE_VERIFICATION'
    const res = await fetch('/api/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, purpose }),
    })
    setVerifyLoading(false)
    if (!res.ok) {
      const msg = await readErrorMessage(res, 'No se pudo enviar OTP')
      setError(msg)
      return
    }
    setOtpSent(true)
    setError(null)
  }

  async function handleVerifyOtp() {
    if (!otp) {
      setError('Ingresa el OTP')
      return
    }
    setVerifyLoading(true)
    const res = await fetch('/api/verify/sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp }),
    })
    setVerifyLoading(false)
    if (!res.ok) {
      const msg = await readErrorMessage(res, 'OTP inválido')
      setError(msg)
      return
    }
    setError(null)
    setStep(step + 1)
  }

  async function handleResendEmail() {
    setVerifyLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/resend-email', {
        method: 'POST',
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setError(data.error ?? 'Error al reenviar')
        return
      }
      setError(null)
      // No mostrar error, indica que se envió
    } catch (err) {
      console.error('Resend error:', err)
      setError('Error al reenviar correo')
    } finally {
      setVerifyLoading(false)
    }
  }

  async function handleVerifyEmail() {
    setVerifyLoading(true)
    setError(null)
    try {
      // Refresh de sesión para obtener emailVerified actualizado
      await updateSession()

      // Pequeña espera para que se actualice
      await new Promise((r) => setTimeout(r, 1500))

      // Recargar sesión desde API
      const response = await fetch('/api/auth/session')
      const newSession = (await response.json()) as { user?: { emailVerified?: boolean | Date } }

      const isVerified = Boolean(newSession.user?.emailVerified)
      if (!isVerified) {
        setError('Tu email aún no ha sido verificado. Revisa tu bandeja de entrada.')
        setVerifyLoading(false)
        return
      }

      setEmailVerified(true)
      setStep(step + 1)
    } catch (err) {
      console.error('Verify email error:', err)
      setError('Error al validar email')
    } finally {
      setVerifyLoading(false)
    }
  }

  async function handleSubmit() {
    setError(null)
    setLoading(true)
    try {
      if (role === 'COACH') {
        const res = await fetch('/api/onboarding/coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName, bio, specialty }),
        })
        if (!res.ok) {
          const msg = await readErrorMessage(res, 'Error al guardar perfil')
          setError(msg)
          return
        }
      } else {
        // Validar que al menos email o teléfono estén presentes
        if (!contactEmail?.trim() && !phone?.trim()) {
          setError('Debes proporcionar email o teléfono de contacto')
          setLoading(false)
          return
        }

        const res = await fetch('/api/onboarding/athlete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName,
            goal,
            coachEmail,
            weightKg: weightKg ? Number(weightKg) : undefined,
            phone: phone?.trim() || undefined,
            contactEmail: contactEmail?.trim() || undefined,
            verificationMethod,
          }),
        })
        if (!res.ok) {
          const msg = await readErrorMessage(res, 'Error al guardar perfil')
          setError(msg)
          return
        }
      }
      setDone(true)
      setStep(totalSteps)
    } finally {
      setLoading(false)
    }
  }

  function goToDashboard() {
    router.push(role === 'COACH' ? '/coach' : '/athlete/plan')
  }

  if (status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="border-accent h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
      </main>
    )
  }

  return (
    <main className="bg-background flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-10 flex flex-col items-center gap-3 text-center">
          <span className="from-accent to-accent-strong flex h-14 w-14 items-center justify-center rounded-3xl bg-linear-to-br text-lg font-bold text-white shadow-[0_8px_24px_var(--accent-glow)]">
            NX
          </span>
          <p className="text-foreground/50 text-sm">
            {done ? '¡Todo listo!' : `Paso ${displayedStep + 1} de ${displayedTotal}`}
          </p>
          <Steps current={displayedStep} total={displayedTotal} />
        </div>

        <div className="border-line bg-surface rounded-3xl border p-8 shadow-[0_8px_40px_var(--accent-glow)]">
          {/* ── STEP -1: Verificación ── */}
          {step === -1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold">Verifica tu cuenta</h2>
                <p className="text-foreground/55 mt-2 text-sm">
                  {!emailVerified
                    ? 'Necesitamos confirmar tu email para continuar.'
                    : `Necesitamos confirmar tu ${role === 'ATHLETE' ? 'teléfono' : 'número de teléfono para facturación'}.`}
                </p>
              </div>

              {error && (
                <p className="border-warning/30 bg-warning/10 text-warning rounded-2xl border px-4 py-3 text-sm">
                  {error}
                </p>
              )}

              {/* Email Verification */}
              {!emailVerified ? (
                <div className="space-y-4">
                  <div className="bg-accent/5 border-accent/20 text-foreground/70 rounded-2xl border p-4 text-sm">
                    <p className="mb-2">📧 Hemos enviado un enlace de verificación a:</p>
                    <p className="text-foreground font-semibold">{session?.user?.email}</p>
                    <p className="mt-2">
                      Haz clic en el enlace del email para verificar tu cuenta.
                    </p>
                  </div>
                  <button
                    onClick={handleVerifyEmail}
                    disabled={verifyLoading}
                    className="from-accent to-accent-strong w-full rounded-2xl bg-linear-to-r py-3 text-sm font-semibold text-white shadow-[0_4px_16px_var(--accent-glow)] transition hover:brightness-110 disabled:opacity-40"
                  >
                    {verifyLoading ? 'Validando...' : 'Ya verifiqué mi email →'}
                  </button>
                  <button
                    onClick={handleResendEmail}
                    disabled={verifyLoading}
                    className="border-line bg-surface-strong text-foreground hover:border-accent/40 w-full rounded-2xl border py-3 text-sm font-semibold transition disabled:opacity-40"
                  >
                    {verifyLoading ? 'Reenviando...' : 'Reenviar correo'}
                  </button>
                </div>
              ) : (
                // SMS/Phone Verification (after email verified)
                <div className="space-y-4">
                  {!otpSent ? (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">
                          Tu teléfono {role === 'COACH' ? '(facturación)' : ''}
                        </label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="678878789"
                          className="border-line bg-surface-strong focus:border-accent w-full rounded-2xl border px-4 py-3 text-sm transition outline-none"
                        />
                      </div>
                      <button
                        onClick={handleSendOtp}
                        disabled={verifyLoading || !phone.trim()}
                        className="from-accent to-accent-strong w-full rounded-2xl bg-linear-to-r py-3 text-sm font-semibold text-white shadow-[0_4px_16px_var(--accent-glow)] transition hover:brightness-110 disabled:opacity-40"
                      >
                        {verifyLoading ? 'Enviando...' : 'Enviar OTP'}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Código OTP (6 dígitos)</label>
                        <input
                          type="text"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                          placeholder="123456"
                          maxLength={6}
                          className="border-line bg-surface-strong focus:border-accent w-full rounded-2xl border px-4 py-3 text-sm transition outline-none"
                        />
                      </div>
                      <button
                        onClick={handleVerifyOtp}
                        disabled={verifyLoading || otp.length !== 6}
                        className="from-accent to-accent-strong w-full rounded-2xl bg-linear-to-r py-3 text-sm font-semibold text-white shadow-[0_4px_16px_var(--accent-glow)] transition hover:brightness-110 disabled:opacity-40"
                      >
                        {verifyLoading ? 'Verificando...' : 'Verificar'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 0: Bienvenida ── */}
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold">Bienvenido a NEXUM</h1>
                <p className="text-foreground/60 mt-2 text-sm">
                  Configuremos tu cuenta en menos de 2 minutos.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Tu rol</p>
                <div className="grid grid-cols-2 gap-3">
                  {(['COACH', 'ATHLETE'] as Role[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRole(r)}
                      className={`flex flex-col items-center gap-2 rounded-2xl border p-5 transition ${
                        role === r
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-line bg-surface-strong text-foreground/60 hover:border-accent/40'
                      }`}
                    >
                      <span className="text-3xl">{r === 'COACH' ? '🏋️' : '⚡'}</span>
                      <span className="text-sm font-semibold">
                        {r === 'COACH' ? 'Entrenador' : 'Atleta'}
                      </span>
                      <span className="text-foreground/40 text-center text-xs">
                        {r === 'COACH' ? 'Gestiona atletas y planes' : 'Sigue tu progreso'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setStep(1)}
                className="from-accent to-accent-strong w-full rounded-2xl bg-linear-to-r py-3 text-sm font-semibold text-white shadow-[0_4px_16px_var(--accent-glow)] transition hover:brightness-110"
              >
                Continuar →
              </button>
            </div>
          )}

          {/* ── STEP 1: Datos de perfil ── */}
          {step === 1 && role === 'COACH' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold">Tu perfil de entrenador</h2>
                <p className="text-foreground/55 mt-1 text-sm">Así te verán tus atletas.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nombre profesional *</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ej: Carlos García"
                  className="border-line bg-surface-strong focus:border-accent w-full rounded-2xl border px-4 py-3 text-sm transition outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Especialidad</label>
                <input
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="Ej: Culturismo natural, Powerlifting…"
                  className="border-line bg-surface-strong focus:border-accent w-full rounded-2xl border px-4 py-3 text-sm transition outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Bio (opcional)</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder="Cuéntanos sobre tu experiencia…"
                  className="border-line bg-surface-strong focus:border-accent w-full resize-none rounded-2xl border px-4 py-3 text-sm transition outline-none"
                />
              </div>
              {error && (
                <p className="border-danger/30 bg-danger/10 text-danger rounded-2xl border px-4 py-3 text-sm">
                  {error}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(0)}
                  className="border-line text-foreground/60 hover:text-foreground flex-1 rounded-2xl border py-3 text-sm transition"
                >
                  ← Atrás
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!displayName.trim()}
                  className="from-accent to-accent-strong flex-1 rounded-2xl bg-linear-to-r py-3 text-sm font-semibold text-white shadow-[0_4px_16px_var(--accent-glow)] transition hover:brightness-110 disabled:opacity-40"
                >
                  Continuar →
                </button>
              </div>
            </div>
          )}

          {step === 1 && role === 'ATHLETE' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold">Tu perfil de atleta</h2>
                <p className="text-foreground/55 mt-1 text-sm">Tu entrenador usará estos datos.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tu nombre completo *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nombre y apellido"
                  className="border-line bg-surface-strong focus:border-accent w-full rounded-2xl border px-4 py-3 text-sm transition outline-none"
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
                  className="border-line bg-surface-strong focus:border-accent w-full rounded-2xl border px-4 py-3 text-sm transition outline-none"
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
                          ? 'border-accent bg-accent/10'
                          : 'border-line bg-surface-strong hover:border-accent/40'
                      }`}
                    >
                      <p
                        className={`text-xs font-semibold ${goal === g.value ? 'text-accent' : 'text-foreground'}`}
                      >
                        {g.label}
                      </p>
                      <p className="text-foreground/45 mt-0.5 text-xs">{g.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(0)}
                  className="border-line text-foreground/60 hover:text-foreground flex-1 rounded-2xl border py-3 text-sm transition"
                >
                  ← Atrás
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!fullName.trim()}
                  className="from-accent to-accent-strong flex-1 rounded-2xl bg-linear-to-r py-3 text-sm font-semibold text-white shadow-[0_4px_16px_var(--accent-glow)] transition hover:brightness-110 disabled:opacity-40"
                >
                  Continuar →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Confirmación / Coach email (atleta) ── */}
          {step === 2 && role === 'COACH' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold">¡Todo listo para empezar!</h2>
                <p className="text-foreground/55 mt-1 text-sm">Revisa tu información.</p>
              </div>
              <div className="border-line bg-surface-strong space-y-3 rounded-2xl border p-4">
                <div>
                  <p className="text-foreground/40 text-xs tracking-widest uppercase">Nombre</p>
                  <p className="font-semibold">{displayName}</p>
                </div>
                {specialty && (
                  <div>
                    <p className="text-foreground/40 text-xs tracking-widest uppercase">
                      Especialidad
                    </p>
                    <p className="text-sm">{specialty}</p>
                  </div>
                )}
                {bio && (
                  <div>
                    <p className="text-foreground/40 text-xs tracking-widest uppercase">Bio</p>
                    <p className="text-foreground/70 text-sm">{bio}</p>
                  </div>
                )}
              </div>
              {error && (
                <p className="border-danger/30 bg-danger/10 text-danger rounded-2xl border px-4 py-3 text-sm">
                  {error}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="border-line text-foreground/60 hover:text-foreground flex-1 rounded-2xl border py-3 text-sm transition"
                >
                  ← Atrás
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="from-accent to-accent-strong flex-1 rounded-2xl bg-linear-to-r py-3 text-sm font-semibold text-white shadow-[0_4px_16px_var(--accent-glow)] transition hover:brightness-110 disabled:opacity-40"
                >
                  {loading ? 'Guardando…' : 'Guardar y entrar →'}
                </button>
              </div>
            </div>
          )}

          {step === 2 && role === 'ATHLETE' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold">Conectar con tu entrenador</h2>
                <p className="text-foreground/55 mt-1 text-sm">
                  Introduce los datos con los que tu coach se registró en NEXUM.
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email del entrenador *</label>
                <input
                  type="email"
                  value={coachEmail}
                  onChange={(e) => setCoachEmail(e.target.value)}
                  placeholder="coach@ejemplo.com"
                  className="border-line bg-surface-strong focus:border-accent w-full rounded-2xl border px-4 py-3 text-sm transition outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tu contacto *</label>
                {verificationMethod === 'SMS' ? (
                  <>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+34 600 123 456"
                      className="border-line bg-surface-strong focus:border-accent w-full rounded-2xl border px-4 py-3 text-sm transition outline-none"
                    />
                    <p className="text-foreground/40 text-xs">
                      Tu teléfono está verificado. El entrenador te contactará por SMS/WhatsApp.
                    </p>
                  </>
                ) : (
                  <>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="tu.email@ejemplo.com"
                      className="border-line bg-surface-strong focus:border-accent w-full rounded-2xl border px-4 py-3 text-sm transition outline-none"
                    />
                    <p className="text-foreground/40 text-xs">
                      Tu email será verificado. El entrenador te contactará por correo.
                    </p>
                  </>
                )}
              </div>

              <div className="border-line bg-surface-strong space-y-2 rounded-2xl border p-4">
                <p className="text-foreground/40 text-xs tracking-widest uppercase">Resumen</p>
                <p className="text-sm">
                  <span className="text-foreground/50">Nombre:</span> {fullName}
                </p>
                <p className="text-sm">
                  <span className="text-foreground/50">Objetivo:</span>{' '}
                  {GOAL_OPTIONS.find((g) => g.value === goal)?.label}
                </p>
                {weightKg && (
                  <p className="text-sm">
                    <span className="text-foreground/50">Peso:</span> {weightKg} kg
                  </p>
                )}
              </div>
              {error && (
                <p className="border-danger/30 bg-danger/10 text-danger rounded-2xl border px-4 py-3 text-sm">
                  {error}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="border-line text-foreground/60 hover:text-foreground flex-1 rounded-2xl border py-3 text-sm transition"
                >
                  ← Atrás
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !coachEmail.trim()}
                  className="from-accent to-accent-strong flex-1 rounded-2xl bg-linear-to-r py-3 text-sm font-semibold text-white shadow-[0_4px_16px_var(--accent-glow)] transition hover:brightness-110 disabled:opacity-40"
                >
                  {loading ? 'Conectando…' : 'Unirme →'}
                </button>
              </div>
            </div>
          )}

          {/* ── DONE ── */}
          {done && step === totalSteps && (
            <div className="space-y-6 text-center">
              <div className="flex flex-col items-center gap-4">
                <span className="bg-accent/15 flex h-20 w-20 items-center justify-center rounded-full text-4xl">
                  🎉
                </span>
                <div>
                  <h2 className="text-2xl font-bold">
                    {role === 'COACH' ? `¡Listo, ${displayName}!` : `¡Bienvenido, ${fullName}!`}
                  </h2>
                  <p className="text-foreground/55 mt-2 text-sm">
                    {role === 'COACH'
                      ? 'Tu cuenta de entrenador está configurada. Empieza añadiendo atletas.'
                      : 'Tu perfil está listo. Tu entrenador ya puede verte en su dashboard.'}
                  </p>
                </div>
              </div>
              <button
                onClick={goToDashboard}
                className="from-accent to-accent-strong w-full rounded-2xl bg-linear-to-r py-3.5 text-sm font-semibold text-white shadow-[0_4px_16px_var(--accent-glow)] transition hover:brightness-110"
              >
                {role === 'COACH' ? 'Ir al Dashboard →' : 'Ver mi Plan →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
