'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Team {
  id: string
  name: string
  slug?: string
  role: 'ADMIN' | 'MEMBER'
}

interface TeamMember {
  userId: string
  email: string
  displayName: string
  role: 'ADMIN' | 'MEMBER'
}

function TeamSettingsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [teamName, setTeamName] = useState('')
  const [teamSlug, setTeamSlug] = useState('')
  const [members, setMembers] = useState<TeamMember[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Cargar lista de equipos
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await fetch('/api/teams')
        if (!res.ok) throw new Error('Error cargando equipos')
        const data: Team[] = await res.json()
        setTeams(data)

        // Seleccionar equipo de URL o el primero disponible
        const teamIdParam = searchParams.get('teamId')
        const defaultTeamId = teamIdParam || (data[0]?.id ?? null)
        setSelectedTeamId(defaultTeamId)

        if (defaultTeamId) {
          fetchTeamDetails(defaultTeamId)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error cargando equipos')
        setLoading(false)
      }
    }

    fetchTeams()
  }, [searchParams])

  // Cargar detalles del equipo seleccionado
  const fetchTeamDetails = async (teamId: string) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/teams/${teamId}`)
      if (!res.ok) throw new Error('Error cargando detalles del equipo')

      const data = await res.json()
      setTeamName(data.name || '')
      setTeamSlug(data.slug || '')

      // TODO: Cargar miembros del equipo cuando la API esté lista
      // Por ahora, usar datos mock
      setMembers([
        {
          userId: 'user-1',
          email: 'coach1@example.com',
          displayName: 'Coach Principal',
          role: 'ADMIN',
        },
        {
          userId: 'user-2',
          email: 'coach2@example.com',
          displayName: 'Coach Asistente',
          role: 'MEMBER',
        },
      ])

      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando detalles')
      setLoading(false)
    }
  }

  const handleTeamSelect = (teamId: string) => {
    setSelectedTeamId(teamId)
    fetchTeamDetails(teamId)
    router.push(`?teamId=${teamId}`)
  }

  const handleSaveTeamDetails = async () => {
    if (!selectedTeamId) return

    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const res = await fetch(`/api/teams/${selectedTeamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: teamName,
          slug: teamSlug || null,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error guardando cambios')
      }

      setSuccess('Cambios guardados correctamente')

      // Actualizar lista de equipos
      const teams = await fetch('/api/teams').then((r) => r.json())
      setTeams(teams)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSaving(false)
    }
  }

  const canEditTeam = selectedTeamId && teams.find((t) => t.id === selectedTeamId)?.role === 'ADMIN'

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-950 via-purple-900 to-slate-900 p-6">
        <div className="mx-auto max-w-4xl text-white/60">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-purple-900 to-slate-900 p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/coach/team"
            className="mb-4 inline-flex items-center gap-2 text-purple-400 hover:text-purple-300"
          >
            ← Volver a Equipo
          </Link>
          <h1 className="mb-2 text-4xl font-bold text-white">⚙️ Configuración de Equipo</h1>
          <p className="text-white/60">Gestiona la configuración de tu equipo de coaching</p>
        </div>

        {/* Alertas */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500 bg-red-500/10 p-4 text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 rounded-lg border border-green-500 bg-green-500/10 p-4 text-green-400">
            {success}
          </div>
        )}

        {/* Selector de Equipo */}
        {teams.length > 1 && (
          <div className="mb-6 rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur">
            <h2 className="mb-4 text-lg font-semibold text-white">Selecciona un equipo</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => handleTeamSelect(team.id)}
                  className={`rounded-lg border p-4 text-left transition-colors ${
                    selectedTeamId === team.id
                      ? 'border-purple-400 bg-purple-600 text-white'
                      : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <div className="font-medium">{team.name}</div>
                  <div className="text-sm opacity-70">
                    {team.role === 'ADMIN' ? '👑 Administrador' : '👤 Miembro'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedTeamId && canEditTeam && (
          <div className="space-y-6">
            {/* Detalles del Equipo */}
            <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur">
              <h2 className="mb-4 text-lg font-semibold text-white">📋 Información del Equipo</h2>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">
                    Nombre del Equipo
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white placeholder-white/40 focus:border-purple-500 focus:outline-none"
                    placeholder="Ej: Mi Equipo de Coaching"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">
                    Slug del URL (opcional)
                  </label>
                  <input
                    type="text"
                    value={teamSlug}
                    onChange={(e) =>
                      setTeamSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                    }
                    className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white placeholder-white/40 focus:border-purple-500 focus:outline-none"
                    placeholder="mi-equipo"
                  />
                  <p className="mt-1 text-xs text-white/50">
                    Solo letras minúsculas, números y guiones
                  </p>
                </div>
              </div>

              <button
                onClick={handleSaveTeamDetails}
                disabled={saving}
                className="mt-6 rounded-lg bg-purple-600 px-6 py-2 font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>

            {/* Miembros del Equipo */}
            <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur">
              <h2 className="mb-4 text-lg font-semibold text-white">👥 Miembros del Equipo</h2>

              {members.length > 0 ? (
                <div className="space-y-3">
                  {members.map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4"
                    >
                      <div>
                        <div className="font-medium text-white">{member.displayName}</div>
                        <div className="text-sm text-white/60">{member.email}</div>
                      </div>
                      <div
                        className={`rounded-full px-3 py-1 text-sm font-medium ${
                          member.role === 'ADMIN'
                            ? 'bg-purple-600 text-white'
                            : 'bg-white/10 text-white/70'
                        }`}
                      >
                        {member.role === 'ADMIN' ? 'Administrador' : 'Miembro'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/60">No hay miembros en este equipo</p>
              )}

              <Link
                href={`/coach/team?teamId=${selectedTeamId}`}
                className="mt-6 inline-block rounded-lg bg-white/10 px-6 py-2 font-medium text-white transition-colors hover:bg-white/20"
              >
                Gestionar Miembros
              </Link>
            </div>
          </div>
        )}

        {!canEditTeam && selectedTeamId && (
          <div className="rounded-lg border border-blue-500 bg-blue-500/10 p-6 text-blue-400">
            ℹ️ Solo los administradores del equipo pueden editar la configuración.
          </div>
        )}
      </div>
    </div>
  )
}

export default function TeamSettingsPage() {
  return (
    <Suspense fallback={null}>
      <TeamSettingsContent />
    </Suspense>
  )
}
