import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function getPlanForPrint(planId: string, userId: string, role: string | undefined) {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    include: {
      athlete: { select: { fullName: true, coachId: true } },
      coach: { select: { userId: true, displayName: true } },
      sessions: {
        orderBy: { order: 'asc' },
        include: { exercises: { orderBy: { order: 'asc' } } },
      },
    },
  })

  if (!plan) return null

  if (role === 'COACH' || role === 'ADMIN') {
    const coach = await prisma.coach.findUnique({ where: { userId }, select: { id: true } })
    if (plan.coachId !== coach?.id) return null
  } else if (role === 'ATHLETE') {
    const athlete = await prisma.athlete.findUnique({ where: { userId }, select: { id: true } })
    if (plan.athleteId !== athlete?.id) return null
  } else {
    return null
  }

  return plan
}

export default async function PrintPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) notFound()

  const role = (session.user as { role?: string }).role
  const plan = await getPlanForPrint(id, session.user.id, role)
  if (!plan) notFound()

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; color: black; }
          .page-break { page-break-before: always; }
        }
        body { font-family: system-ui, sans-serif; }
      `}</style>

      {/* Botón imprimir — no aparece al imprimir */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className="bg-accent rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg"
        >
          Imprimir / Guardar PDF
        </button>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="border-line rounded-xl border bg-white px-5 py-2.5 text-sm"
        >
          Volver
        </button>
      </div>

      <main className="mx-auto max-w-370 px-6 py-12">
        {/* Header */}
        <div className="mb-8 border-b pb-6">
          <p className="text-xs tracking-widest text-gray-400 uppercase">Plan de entrenamiento</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">{plan.title}</h1>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
            <span>
              Atleta: <strong className="text-gray-800">{plan.athlete.fullName}</strong>
            </span>
            <span>
              Semanas: <strong className="text-gray-800">{plan.weeksCount}</strong>
            </span>
            {plan.coach && (
              <span>
                Coach: <strong className="text-gray-800">{plan.coach.displayName}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Sessions */}
        {plan.sessions.map((session, si) => (
          <section key={session.id} className={si > 0 ? 'mt-8' : ''}>
            <div className="mb-3 flex items-baseline gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
                {si + 1}
              </span>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{session.name}</h2>
                <p className="text-sm text-gray-400">{session.block}</p>
              </div>
            </div>

            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200 text-left text-xs tracking-wide text-gray-400 uppercase">
                  <th className="py-2 pr-3">Ejercicio</th>
                  <th className="py-2 pr-3 text-center">Series</th>
                  <th className="py-2 pr-3 text-center">Reps</th>
                  <th className="py-2 pr-3 text-center">RIR</th>
                  <th className="py-2 pr-3 text-center">Descanso</th>
                  <th className="py-2 pr-3">Carga</th>
                  <th className="py-2">Coach cue</th>
                </tr>
              </thead>
              <tbody>
                {session.exercises.map((ex, ei) => (
                  <tr key={ex.id} className={ei % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="py-2 pr-3 font-medium text-gray-900">{ex.exercise}</td>
                    <td className="py-2 pr-3 text-center text-gray-700">{ex.sets}</td>
                    <td className="py-2 pr-3 text-center text-gray-700">{ex.reps}</td>
                    <td className="py-2 pr-3 text-center text-gray-700">{ex.targetRir ?? '—'}</td>
                    <td className="py-2 pr-3 text-center text-gray-700">
                      {ex.restSeconds ? `${ex.restSeconds}s` : '—'}
                    </td>
                    <td className="py-2 pr-3 text-gray-700">
                      {ex.loadKg ? `${ex.loadKg} kg` : (ex.loadNote ?? '—')}
                    </td>
                    <td className="py-2 text-xs text-gray-500">
                      {ex.coachCue ?? ex.notes ?? ''}
                      {ex.progressionNote ? (
                        <span className="block text-gray-400">{ex.progressionNote}</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {session.exercises.some((e) => e.technique) && (
              <div className="mt-3 space-y-1">
                {session.exercises
                  .filter((e) => e.technique)
                  .map((e) => (
                    <p key={e.id} className="text-xs text-gray-500">
                      <strong>{e.exercise}:</strong> {e.technique}
                      {e.techniqueDetail ? ` — ${e.techniqueDetail}` : ''}
                    </p>
                  ))}
              </div>
            )}
          </section>
        ))}

        <p className="mt-12 text-center text-xs text-gray-300">
          Generado por NEXUM · {new Date().toLocaleDateString('es-ES')}
        </p>
      </main>
    </>
  )
}
