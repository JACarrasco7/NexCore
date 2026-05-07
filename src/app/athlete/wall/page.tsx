"use client";

import { SectionIntro } from "@/components/section-intro";
import { TeamWall } from "@/components/team-wall";

export default function AthleteWallPage() {
  return (
    <main className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-8 px-6 py-8 md:px-10 lg:px-12">
      <SectionIntro
        eyebrow="Muro de equipo"
        title="Novedades del equipo"
        description="Mensajes de tu coach, logros compartidos y comunicados del equipo."
      />
      <TeamWall isCoach={false} />
    </main>
  );
}
