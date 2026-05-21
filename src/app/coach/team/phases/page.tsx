import { PageShell } from '@/components/layout'
import TeamPhasesAdmin from '@/components/team/team-phases-admin'
import { SectionIntro } from '@/components/section-intro'

export default function TeamPhasesPage() {
  return (
    <PageShell>
      <SectionIntro
        eyebrow="Team"
        title="Fases"
        description="Define y gestiona las fases del equipo (ej. Semana 1, Semana 2). Editable por el staff del equipo y coaches."
        aside="Las fases permiten agrupar revisiones y ciclos de entrenamiento."
      />

      <div className="mt-6">
        <TeamPhasesAdmin />
      </div>
    </PageShell>
  )
}
