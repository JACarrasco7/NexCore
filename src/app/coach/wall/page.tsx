'use client'

import { PageShell } from '@/components/layout'
import { SectionIntro } from '@/components/section-intro'
import { TeamWall } from '@/components/team-wall'

export default function CoachWallPage() {
  return (
    <PageShell>
      <SectionIntro
        eyebrow="Muro de equipo"
        title="Comunicación del equipo"
        description="Publica motivación, logros, avisos o cambios de plan. El equipo los ve en tiempo real."
      />
      <TeamWall isCoach />
    </PageShell>
  )
}
