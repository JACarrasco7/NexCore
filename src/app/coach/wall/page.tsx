"use client";

import { SectionIntro } from "@/components/section-intro";
import { TeamWall } from "@/components/team-wall";

export default function CoachWallPage() {
  return (
    <main className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-8 px-6 py-8 md:px-10">
      <SectionIntro
        eyebrow="Muro de equipo"
        title="Comunicación del equipo"
        description="Publica motivación, logros, avisos o cambios de plan. El equipo los ve en tiempo real."
      />
      <TeamWall isCoach />
    </main>
  );
}
