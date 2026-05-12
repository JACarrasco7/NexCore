'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'COACH',
    verificationMethod: 'EMAIL', // Para ATHLETE
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')

  // Paso 1: Enviar OTP si ATHLETE + SMS
  async function handleSendOtp() {
    if (!form.phone?.trim()) {
      setError('Ingresa un teléfono')
      return
    }

    setLoading(true)
    const res = await fetch('/api/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: form.phone,
        purpose: 'ATHLETE_VERIFICATION',
      }),
    })
    setLoading(false)

    if (!res.ok) {
      let msg = 'No se pudo enviar el OTP'
      try {
        const data = await res.json()
        if (data?.error) msg = data.error
      } catch {
        /* ignore */
      }
      setError(msg)
      return
    }

    setOtpSent(true)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Validar teléfono requerido para coaches
    if (form.role === 'COACH' && !form.phone?.trim()) {
      setError('El teléfono es requerido para coaches')
      return
    }

    // Validar OTP si ATHLETE + SMS
    if (form.role === 'ATHLETE' && form.verificationMethod === 'SMS' && !otp) {
      setError('Ingresa el OTP enviado a tu teléfono')
      return
    }

    setLoading(true)
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setLoading(false)
    if (!res.ok) {
      let msg = 'No se pudo crear la cuenta. Intenta de nuevo.'
      try {
        const data = await res.json()
        if (data?.error) msg = data.error
      } catch {
        /* ignore */
      }
      setError(msg)
      return
    }

    // Guardar método de verificación en sessionStorage para onboarding
    if (form.role === 'ATHLETE') {
      try {
        sessionStorage.setItem('athleteVerificationMethod', form.verificationMethod)
      } catch (e) {
        console.error('Error guardando verificationMethod:', e)
      }
    }

    // Auto-login con credentials
    setLoading(true)
    const signInRes = await signIn('credentials', {
      email: form.email,
      password: form.password,
      redirect: false,
    })
    setLoading(false)

    if (!signInRes?.ok) {
      setError('Auto-login falló. Intenta manualmente en login.')
      router.push('/login?next=/onboarding')
      return
    }

    // Redirigir a onboarding
    router.push('/onboarding')
  }

  const isAthlete = form.role === 'ATHLETE'
  const smsModeActive = isAthlete && form.verificationMethod === 'SMS'

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <span className="from-accent to-accent-strong flex h-14 w-14 items-center justify-center rounded-3xl bg-linear-to-br text-lg font-bold text-white shadow-[0_8px_24px_var(--accent-glow)]">
              NX
            </span>
          </div>
          <h1 className="text-2xl font-bold">Crear cuenta</h1>
          <p className="text-foreground/55 mt-1.5 text-sm">Empieza tu prueba gratuita</p>
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
            <label htmlFor="name" className="text-sm font-medium">
              Nombre
            </label>
            <input
              id="name"
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="border-line bg-surface-strong focus:border-accent focus:ring-accent/20 w-full rounded-2xl border px-4 py-3 text-sm transition outline-none focus:ring-2"
              placeholder="Tu nombre"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
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
              autoComplete="new-password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="border-line bg-surface-strong focus:border-accent focus:ring-accent/20 w-full rounded-2xl border px-4 py-3 text-sm transition outline-none focus:ring-2"
              placeholder="Mínimo 8 caracteres"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="role" className="text-sm font-medium">
              Tipo de cuenta
            </label>
            <select
              id="role"
              value={form.role}
              onChange={(e) => {
                setForm({ ...form, role: e.target.value, verificationMethod: 'EMAIL' })
                setOtpSent(false)
                setOtp('')
                setError(null)
              }}
              className="border-line bg-surface-strong focus:border-accent focus:ring-accent/20 w-full rounded-2xl border px-4 py-3 text-sm transition outline-none focus:ring-2"
            >
              <option value="COACH">Coach</option>
              <option value="ATHLETE">Atleta</option>
            </select>
          </div>

          {/* Para ATHLETE: Elegir método de verificación */}
          {isAthlete && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Verificar por</label>
              <div className="flex gap-3">
                <label className="flex flex-1 cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    value="EMAIL"
                    checked={form.verificationMethod === 'EMAIL'}
                    onChange={(e) => {
                      setForm({ ...form, verificationMethod: e.target.value })
                      setOtpSent(false)
                      setOtp('')
                      setError(null)
                    }}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Email</span>
                </label>
                <label className="flex flex-1 cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    value="SMS"
                    checked={form.verificationMethod === 'SMS'}
                    onChange={(e) => {
                      setForm({ ...form, verificationMethod: e.target.value })
                      setOtpSent(false)
                      setOtp('')
                      setError(null)
                    }}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">SMS/WhatsApp</span>
                </label>
              </div>
            </div>
          )}

          {/* Campo teléfono: COACH siempre, ATHLETE si SMS */}
          {(form.role === 'COACH' || smsModeActive) && (
            <div className="space-y-1.5">
              <label htmlFor="phone" className="text-sm font-medium">
                Teléfono{' '}
                {(form.role === 'COACH' || smsModeActive) && <span className="text-accent">*</span>}
              </label>
              <input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                disabled={smsModeActive && otpSent}
                className="border-line bg-surface-strong focus:border-accent focus:ring-accent/20 w-full rounded-2xl border px-4 py-3 text-sm transition outline-none focus:ring-2 disabled:opacity-50"
                placeholder="+34 600 123 456"
                required={form.role === 'COACH' || smsModeActive}
              />
            </div>
          )}

          {/* Botón enviar OTP */}
          {smsModeActive && !otpSent && (
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={loading || !form.phone?.trim()}
              className="border-accent/30 text-accent hover:bg-accent/5 w-full rounded-full border py-3 text-sm font-semibold transition disabled:opacity-50"
            >
              {loading ? 'Enviando OTP...' : 'Enviar OTP'}
            </button>
          )}

          {/* Campo OTP */}
          {smsModeActive && otpSent && (
            <div className="space-y-1.5">
              <label htmlFor="otp" className="text-sm font-medium">
                Código OTP <span className="text-accent">*</span>
              </label>
              <input
                id="otp"
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="border-line bg-surface-strong focus:border-accent focus:ring-accent/20 w-full rounded-2xl border px-4 py-3 text-center text-sm tracking-wider transition outline-none focus:ring-2"
                placeholder="000000"
                required
              />
              <p className="text-foreground/50 text-xs">
                Revisa tu teléfono. El código es válido por 10 minutos.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (smsModeActive && !otpSent)}
            className="from-accent to-accent-strong w-full rounded-full bg-linear-to-r py-3 text-sm font-bold text-white shadow-[0_4px_16px_var(--accent-glow)] transition hover:opacity-90 hover:shadow-[0_6px_22px_var(--accent-glow)] disabled:opacity-50"
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-foreground/55 mt-6 text-center text-sm">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-accent font-semibold hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </main>
  )
}
