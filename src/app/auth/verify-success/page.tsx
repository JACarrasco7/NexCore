import Link from "next/link";

export default function VerifySuccessPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-3xl text-success">
        ✓
      </div>
      <h1 className="text-2xl font-bold">Email verificado</h1>
      <p className="text-sm text-foreground/60">Tu dirección de email ha sido confirmada correctamente.</p>
      <Link
        href="/athlete/dashboard"
        className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong"
      >
        Ir al dashboard
      </Link>
    </main>
  );
}
