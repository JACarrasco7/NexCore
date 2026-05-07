import TwoFactorSettings from "@/components/two-factor-settings";
import { SectionIntro } from "@/components/section-intro";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) return redirect('/login');

  return (
    <div className="max-w-4xl mx-auto py-8">
      <SectionIntro eyebrow="Cuenta" title="Ajustes" description="Configura tu cuenta y preferencias" />

      <div className="mt-6 grid gap-6">
        <section>
          <h2 className="text-lg font-semibold">Seguridad</h2>
          <p className="mt-1 text-sm text-foreground/60">Gestiona la autenticación en dos pasos y los códigos de respaldo.</p>
          <div className="mt-4">
            <TwoFactorSettings />
          </div>
        </section>
      </div>
    </div>
  );
}
