"use client";
export const dynamic = 'force-dynamic'

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const REASONS: Record<string, string> = {
  missing: "El enlace está incompleto o mal formado.",
  invalid: "El token de verificación no es válido o ya fue utilizado.",
  expired: "El enlace ha caducado. Solicita uno nuevo desde tu dashboard.",
};

function Content() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason") ?? "invalid";
  const message = REASONS[reason] ?? REASONS.invalid;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-danger/10 text-3xl text-danger">
        ✕
      </div>
      <h1 className="text-2xl font-bold">Error de verificación</h1>
      <p className="max-w-sm text-sm text-foreground/60">{message}</p>
      <Link
        href="/athlete/dashboard"
        className="rounded-full border border-line bg-surface px-6 py-3 text-sm font-semibold transition hover:bg-surface-strong"
      >
        Volver al dashboard
      </Link>
    </main>
  );
}

export default function VerifyErrorPage() {
  return (
    <Suspense>
      <Content />
    </Suspense>
  );
}
