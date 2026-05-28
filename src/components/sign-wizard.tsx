'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { apiPost } from '@/lib/store'
import OtpModal from './otp-modal'

type Props = {
  documentId: string
  onClose?: () => void
}

export default function SignWizard({ documentId, onClose }: Props) {
  const { data: session } = useSession()
  const email = session?.user?.email
  const [step, setStep] = useState(1)
  const [dni, setDni] = useState('')
  const [checkbox, setCheckbox] = useState(false)
  const [loading, setLoading] = useState(false)
  const [otpOpen, setOtpOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)

  async function requestOtp(email: string) {
    setMessage(null)
    setLoading(true)
    try {
      await apiPost('/api/auth/otp/generate', { email, type: 'SIGNATURE' })
      setOtpOpen(true)
      setStep(3)
    } catch (err: any) {
      setMessage(err?.message ?? 'Error al solicitar código')
    } finally {
      setLoading(false)
    }
  }

  async function onOtpCollected(payload: { code?: string }) {
    const code = payload.code
    if (!code) return setMessage('Código inválido')
    setLoading(true)
    setMessage(null)
    try {
      const body = await apiPost<{ signedUrl?: string }>(`/api/documents/${documentId}/sign`, {
        otp: code,
        dni,
        checkboxAccepted: checkbox,
      })
      setSignedUrl((body as any).signedUrl ?? null)
      setStep(4)
    } catch (err: any) {
      setMessage(err?.message ?? 'Error al firmar')
    } finally {
      setLoading(false)
      setOtpOpen(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-surface w-full max-w-2xl rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold">Firmar documento</h3>
          <button onClick={onClose} className="text-foreground/60 text-sm">
            Cerrar
          </button>
        </div>

        {step === 1 && (
          <div className="mt-4">
            <p className="text-foreground/60 text-sm">
              Antes de firmar, confirma que has leído y entiendes el acuerdo legal asociado.
            </p>
            <div className="mt-4">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={checkbox}
                  onChange={(e) => setCheckbox(e.target.checked)}
                />
                <span className="text-sm">He leído y acepto el acuerdo legal</span>
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={onClose} className="border-line rounded-xl border px-3 py-1 text-sm">
                Cancelar
              </button>
              <button
                disabled={!checkbox}
                onClick={() => setStep(2)}
                className="bg-accent rounded-full px-3 py-1 text-sm font-semibold text-white"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-4">
            <p className="text-foreground/60 text-sm">
              Introduce tu DNI para la firma (se guardará en registro legal).
            </p>
            <input
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              placeholder="DNI"
              className="border-line mt-3 w-full rounded-lg border px-3 py-2 text-sm"
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="border-line rounded-xl border px-3 py-1 text-sm"
              >
                Atrás
              </button>
              <button
                disabled={!dni}
                onClick={async () => {
                  setLoading(true)
                  try {
                    if (email) {
                      await requestOtp(email)
                    } else {
                      setOtpOpen(true)
                      setStep(3)
                    }
                  } catch (err) {
                    setOtpOpen(true)
                    setStep(3)
                  } finally {
                    setLoading(false)
                  }
                }}
                className="bg-accent rounded-full px-3 py-1 text-sm font-semibold text-white"
              >
                Solicitar código
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-4">
            <p className="text-foreground/60 text-sm">Introduce el código enviado a tu email.</p>
            {message && <p className="text-danger mt-2 text-sm">{message}</p>}
          </div>
        )}

        {step === 4 && (
          <div className="mt-4">
            <p className="text-foreground/60 text-sm">Firma completada ✅</p>
            {signedUrl && (
              <p className="mt-3">
                <a
                  href={signedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent underline"
                >
                  Descargar documento firmado
                </a>
              </p>
            )}
            <div className="mt-4">
              <button
                onClick={onClose}
                className="bg-accent rounded-full px-3 py-1 text-sm font-semibold text-white"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        <OtpModal
          open={otpOpen}
          email={email ?? ''}
          type="SIGNATURE"
          collectOnly
          onClose={() => setOtpOpen(false)}
          onValidated={onOtpCollected}
        />
      </div>
    </div>
  )
}
