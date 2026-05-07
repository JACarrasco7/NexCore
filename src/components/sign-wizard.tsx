"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import OtpModal from "./otp-modal";

type Props = {
  documentId: string;
  onClose?: () => void;
};

export default function SignWizard({ documentId, onClose }: Props) {
  const { data: session } = useSession();
  const email = session?.user?.email;
  const [step, setStep] = useState(1);
  const [dni, setDni] = useState("");
  const [checkbox, setCheckbox] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  async function requestOtp(email: string) {
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, type: "SIGNATURE" }),
      });
      const body = await res.json();
      if (!res.ok) {
        setMessage(body.error ?? "Error al solicitar código");
      } else {
        setOtpOpen(true);
        setStep(3);
      }
    } catch (err) {
      setMessage("Error de red");
    } finally {
      setLoading(false);
    }
  }

  async function onOtpCollected(payload: { code?: string }) {
    const code = payload.code;
    if (!code) return setMessage("Código inválido");
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/sign`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ otp: code, dni, checkboxAccepted: checkbox }),
      });
      const body = await res.json();
      if (!res.ok) {
        setMessage(body.error ?? body.message ?? "Error al firmar");
      } else {
        setSignedUrl(body.signedUrl ?? null);
        setStep(4);
      }
    } catch (err) {
      setMessage("Error de red");
    } finally {
      setLoading(false);
      setOtpOpen(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl rounded-2xl bg-surface p-6">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold">Firmar documento</h3>
          <button onClick={onClose} className="text-sm text-foreground/60">Cerrar</button>
        </div>

        {step === 1 && (
          <div className="mt-4">
            <p className="text-sm text-foreground/60">Antes de firmar, confirma que has leído y entiendes el acuerdo legal asociado.</p>
            <div className="mt-4">
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={checkbox} onChange={(e) => setCheckbox(e.target.checked)} />
                <span className="text-sm">He leído y acepto el acuerdo legal</span>
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={onClose} className="rounded-xl border border-line px-3 py-1 text-sm">Cancelar</button>
              <button disabled={!checkbox} onClick={() => setStep(2)} className="rounded-full bg-accent px-3 py-1 text-sm font-semibold text-white">Continuar</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-4">
            <p className="text-sm text-foreground/60">Introduce tu DNI para la firma (se guardará en registro legal).</p>
            <input value={dni} onChange={(e) => setDni(e.target.value)} placeholder="DNI" className="mt-3 w-full rounded-lg border border-line px-3 py-2 text-sm" />
            <div className="mt-4 flex gap-2">
              <button onClick={() => setStep(1)} className="rounded-xl border border-line px-3 py-1 text-sm">Atrás</button>
              <button disabled={!dni} onClick={async () => {
                setLoading(true);
                try {
                  if (email) {
                    await requestOtp(email);
                  } else {
                    setOtpOpen(true);
                    setStep(3);
                  }
                } catch (err) {
                  setOtpOpen(true);
                  setStep(3);
                } finally {
                  setLoading(false);
                }
              }} className="rounded-full bg-accent px-3 py-1 text-sm font-semibold text-white">Solicitar código</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-4">
            <p className="text-sm text-foreground/60">Introduce el código enviado a tu email.</p>
            {message && <p className="mt-2 text-sm text-danger">{message}</p>}
          </div>
        )}

        {step === 4 && (
          <div className="mt-4">
            <p className="text-sm text-foreground/60">Firma completada ✅</p>
            {signedUrl && (
              <p className="mt-3"><a href={signedUrl} target="_blank" rel="noreferrer" className="text-accent underline">Descargar documento firmado</a></p>
            )}
            <div className="mt-4">
              <button onClick={onClose} className="rounded-full bg-accent px-3 py-1 text-sm font-semibold text-white">Cerrar</button>
            </div>
          </div>
        )}

        <OtpModal open={otpOpen} email={email ?? ""} type="SIGNATURE" collectOnly onClose={() => setOtpOpen(false)} onValidated={onOtpCollected} />
      </div>
    </div>
  );
}
