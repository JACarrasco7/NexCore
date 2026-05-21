"use client";

import { useEffect, useState } from "react";
import { apiFetch, apiPost } from '@/lib/store'

export default function TwoFactorSettings() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    try {
      const json = await apiFetch<any>('/api/2fa/status')
      setEnabled(Boolean(json?.totpEnabled))
    } catch (err) {
      setEnabled(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function startSetup() {
    setMessage(null);
    setLoading(true);
    try {
      const json = await apiFetch<any>('/api/2fa/setup')
      setQr(json.qr)
      setSecret(null)
    } catch (err: any) {
      setMessage(err?.message ?? 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function enable() {
    if (!secret || !code) return setMessage('Introduce el código');
    setLoading(true);
    setMessage(null);
    try {
      const json = await apiPost('/api/2fa/enable', { token: code })
      setBackupCodes(Array.isArray((json as any).backupCodes) ? (json as any).backupCodes : null)
      setEnabled(true)
      setQr(null)
      setSecret(null)
      setCode('')
    } catch (err: any) {
      setMessage(err?.message ?? 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function disable(useBackup = false) {
    setLoading(true);
    setMessage(null);
    try {
      const body: any = {};
      if (useBackup) body.backupCode = code;
      else body.token = code;
      await apiPost('/api/2fa/disable', body)
      setEnabled(false)
      setCode('')
      setMessage('2FA deshabilitado')
    } catch (err: any) {
      setMessage(err?.message ?? 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <h3 className="text-lg font-semibold">Autenticación en dos pasos (TOTP)</h3>
      <p className="mt-2 text-sm text-foreground/60">Usa una app de autenticación (Authy, Google Authenticator) para generar códigos temporales.</p>

      {enabled === null ? (
        <p className="mt-3 text-sm text-foreground/50">Cargando...</p>
      ) : enabled ? (
        <div className="mt-4">
          <p className="text-sm">Estado: <strong>Habilitado</strong></p>
          <div className="mt-3 flex gap-2">
            <input placeholder="Código TOTP o backup" value={code} onChange={(e) => setCode(e.target.value)} className="rounded-md border border-line px-3 py-2 text-sm" />
            <button disabled={loading || !code} onClick={() => void disable(false)} className="rounded-md border border-line px-3 py-2 text-sm">Deshabilitar (TOTP)</button>
            <button disabled={loading || !code} onClick={() => void disable(true)} className="rounded-md border border-line px-3 py-2 text-sm">Deshabilitar (Backup)</button>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-sm">Estado: <strong>No habilitado</strong></p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => void startSetup()} className="rounded-md border border-line px-3 py-2 text-sm">Habilitar 2FA</button>
          </div>
        </div>
      )}

      {qr && (
        <div className="mt-4">
          <p className="text-sm">Escanea este QR con tu app de autenticación y copia el código:</p>
          <div className="mt-3 flex gap-3 items-start">
            <img src={qr} alt="QR TOTP" className="h-28 w-28 rounded-md border" />
            <div className="flex-1">
              <p className="text-xs text-foreground/45">Clave secreta (cópiala si necesitas configurarlo manualmente):</p>
              <pre className="mt-2 rounded-md bg-background p-2 text-sm">{secret}</pre>
              <div className="mt-3 flex gap-2">
                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Código de 6 dígitos" className="rounded-md border border-line px-3 py-2 text-sm" />
                <button disabled={loading || code.length === 0} onClick={() => void enable()} className="rounded-md bg-accent px-3 py-2 text-sm text-white">Verificar y habilitar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {backupCodes && (
        <div className="mt-4 rounded-md border border-line p-3 bg-surface-strong">
          <p className="text-sm font-semibold">Códigos de respaldo (guárdalos ahora, no se mostrarán nuevamente)</p>
          <ul className="mt-2 grid grid-cols-2 gap-2">
            {backupCodes.map((c) => <li key={c} className="rounded-md border border-line px-2 py-1 text-xs font-mono">{c}</li>)}
          </ul>
        </div>
      )}

      {message && <p className="mt-3 text-sm text-danger">{message}</p>}
    </div>
  );
}
