import { PageShell } from '@/components/layout'
import TeamTagsAdmin from '@/components/team/team-tags-admin'
import { SectionIntro } from '@/components/section-intro'

export default function TeamTagsPage() {
  return (
    <PageShell>
      <SectionIntro
        eyebrow="Team"
        title="Etiquetas"
        description="Crea y gestiona etiquetas del equipo para categorizar contenido (p.ej. nivel, objetivo, macro)."
        aside="Etiquetas globales por equipo usadas en planes, posts y filtros."
      />

      <div className="mt-6">
        <TeamTagsAdmin />
      </div>
    </PageShell>
  )
}
