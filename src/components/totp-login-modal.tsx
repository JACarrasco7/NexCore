"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  open: boolean;
  onClose: () => void;
  next: string;
};

export default function TotpLoginModal({ open, onClose, next }: Props) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!open) return null;

  async function verify(useBackup = false) {
    setLoading(true);
    setError(null);
    try {
      const body: any = {};
      if (useBackup) body.backupCode = code;
      else body.token = code;
      const res = await fetch("/api/2fa/validate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Código inválido");
      } else {
        // Success: proceed to app
        router.push(next);
      }
    } catch (err) {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-surface p-6">
        <h3 className="text-lg font-semibold">Verificación en dos pasos</h3>
        <p className="mt-2 text-sm text-foreground/60">Introduce el código de tu app de autenticación o un código de respaldo.</p>

        <div className="mt-4 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.trim())}
            placeholder="Código TOTP o backup"
            className="w-full rounded-xl border border-line bg-background px-4 py-3 text-lg"
          />
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex gap-2">
            <button type="button" onClick={() => void verify(false)} disabled={loading || !code} className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white">Verificar</button>
            <button type="button" onClick={() => void verify(true)} disabled={loading || !code} className="rounded-xl border border-line px-4 py-2 text-sm">Usar backup</button>
          </div>
          <button type="button" onClick={onClose} className="text-sm text-foreground/60">Cerrar</button>
        </div>
      </div>
    </div>
  );
}
