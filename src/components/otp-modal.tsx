'use client'

import { useEffect, useState } from 'react'
import { apiPost } from '@/lib/store'

type Props = {
  open: boolean
  email: string
  type?: 'LOGIN' | 'SIGNATURE' | 'RESET'
  onClose: () => void
  onValidated?: (data: { userId?: string; nextStep?: string; code?: string }) => void
  collectOnly?: boolean
}

export default function OtpModal({
  open,
  email,
  type = 'LOGIN',
  onClose,
  onValidated,
  collectOnly,
}: Props) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState<number>(0)
  const cooldownRef = { id: undefined as any } as { id?: NodeJS.Timeout }

  useEffect(() => {
    if (!open) {
      setCode('')
      setError(null)
      setHint(null)
    }
  }, [open])

  async function sendCode() {
    setError(null)
    setLoading(true)
    try {
      const body = await apiPost('/api/auth/otp/generate', { email, type })
      setHint((body as any).hint ?? 'Código enviado, revisa tu email')
      // Start local resend cooldown (60s)
      setCooldown(60)
      if (cooldownRef.id) clearInterval(cooldownRef.id)
      cooldownRef.id = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) {
            if (cooldownRef.id) clearInterval(cooldownRef.id)
            return 0
          }
          return c - 1
        })
      }, 1000) as any
    } catch (err) {
      setError('Error de red')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    return () => {
      if (cooldownRef.id) clearInterval(cooldownRef.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleValidate(e?: React.FormEvent) {
    e?.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (collectOnly) {
        onValidated?.({ code })
        onClose()
        return
      }

      const body = await apiPost('/api/auth/otp/validate', { email, code, type })
      onValidated?.({ userId: (body as any).userId, nextStep: (body as any).nextStep })
      onClose()
    } catch (err) {
      setError('Error de red')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form onSubmit={handleValidate} className="bg-surface w-full max-w-md rounded-2xl p-6">
        <h3 className="text-lg font-semibold">Código de verificación</h3>
        <p className="text-foreground/60 mt-2 text-sm">
          Se enviará un código al email <strong>{email}</strong>.
        </p>

        {hint && <p className="text-foreground/50 mt-3 text-sm">{hint}</p>}

        <div className="mt-4 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
            inputMode="numeric"
            pattern="\\d{6}"
            placeholder="######"
            className="border-line bg-background w-full rounded-xl border px-4 py-3 text-center text-lg tracking-[0.35em] outline-none"
          />
        </div>

        {error && <p className="text-danger mt-3 text-sm">{error}</p>}

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={sendCode}
              disabled={loading || cooldown > 0}
              className="border-line rounded-xl border px-3 py-2 text-sm"
            >
              {loading
                ? 'Enviando...'
                : cooldown > 0
                  ? `Reenviar en ${cooldown}s`
                  : 'Reenviar código'}
            </button>
            <button
              type="submit"
              className="bg-accent rounded-full px-4 py-2 text-sm font-semibold text-white"
            >
              Validar
            </button>
          </div>
          <button type="button" onClick={onClose} className="text-foreground/60 text-sm">
            Cerrar
          </button>
        </div>
      </form>
    </div>
  )
}
