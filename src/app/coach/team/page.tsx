'use client'

import Link from 'next/link'
import { useEffect, useId, useState } from 'react'
import { SectionIntro } from '@/components/section-intro'
import { useToast } from '@/components/ui/toast'
import { Skeleton } from '@/components/ui/skeleton'
import { ViewModeToggle } from '@/components/ui/view-mode-toggle'

type Coach = {
  coachId: string
  displayName: string
  email: string
  phone: string | null
  role: 'ADMIN' | 'MEMBER'
}

type Invite = {
  id: string
  invitedEmail: string
  role: 'ADMIN' | 'MEMBER'
  expiresAt: string
  acceptedAt: string | null
  createdAt: string
}

export default function CoachTeamPage() {
  const formId = useId()
  const { pushToast } = useToast()

  const [teamId, setTeamId] = useState<string | null>(null)
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'table' | 'list'>('list')

  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'MEMBER' | 'ADMIN'>('MEMBER')
  const [inviting, setInviting] = useState(false)

  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null)
  const [newRole, setNewRole] = useState<'MEMBER' | 'ADMIN'>('MEMBER')
  const [updating, setUpdating] = useState(false)

  // Cargar coaches y equipo
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const coachRes = await fetch('/api/teams/coaches')
        if (coachRes.ok) {
          const data = (await coachRes.json()) as {
            teamId: string | null
            coaches: Coach[]
          }
          setTeamId(data.teamId)
          setCoaches(data.coaches)
        }

        // TODO: Cargar invitaciones pendientes
        // const invitesRes = await fetch(`/api/teams/invites?teamId=${data.teamId}`);
        // if (invitesRes.ok) setInvites(await invitesRes.json());
      } catch (err) {
        pushToast({ title: 'Error al cargar', variant: 'error' })
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [pushToast])

  async function handleInvite() {
    if (!teamId || !inviteEmail) return
    setInviting(true)
    try {
      const res = await fetch('/api/teams/coaches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          invitedEmail: inviteEmail.toLowerCase(),
          inviteRole,
        }),
      })

      if (res.ok) {
        pushToast({
          title: 'Invitación enviada',
          description: `Invitación enviada a ${inviteEmail}`,
          variant: 'success',
        })
        setInviteEmail('')
        setShowInviteForm(false)
        // Recargar coaches
        const coachRes = await fetch('/api/teams/coaches')
        if (coachRes.ok) {
          const data = (await coachRes.json()) as { coaches: Coach[] }
          setCoaches(data.coaches)
        }
      } else {
        const err = (await res.json()) as { error?: string }
        pushToast({
          title: err.error ?? 'Error al invitar',
          variant: 'error',
        })
      }
    } finally {
      setInviting(false)
    }
  }

  async function handleChangeRole(coachId: string, role: 'ADMIN' | 'MEMBER') {
    if (!teamId) return
    setUpdating(true)
    try {
      const res = await fetch(`/api/teams/coaches/${coachId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, newRole: role }),
      })

      if (res.ok) {
        pushToast({
          title: 'Rol actualizado',
          variant: 'success',
        })
        // Recargar
        const coachRes = await fetch('/api/teams/coaches')
        if (coachRes.ok) {
          const data = (await coachRes.json()) as { coaches: Coach[] }
          setCoaches(data.coaches)
        }
        setSelectedCoachId(null)
      } else {
        const err = (await res.json()) as { error?: string }
        pushToast({
          title: err.error ?? 'Error al cambiar rol',
          variant: 'error',
        })
      }
    } finally {
      setUpdating(false)
    }
  }

  async function handleRemove(coachId: string) {
    if (!teamId) return
    const confirmed = window.confirm(
      '¿Estás seguro de que quieres remover a este coach del equipo?'
    )
    if (!confirmed) return

    try {
      const res = await fetch(`/api/teams/coaches/${coachId}?teamId=${teamId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        pushToast({
          title: 'Coach removido',
          variant: 'success',
        })
        // Recargar
        const coachRes = await fetch('/api/teams/coaches')
        if (coachRes.ok) {
          const data = (await coachRes.json()) as { coaches: Coach[] }
          setCoaches(data.coaches)
        }
      } else {
        const err = (await res.json()) as { error?: string }
        pushToast({
          title: err.error ?? 'Error al remover',
          variant: 'error',
        })
      }
    } catch (err) {
      pushToast({
        title: 'Error al remover',
        variant: 'error',
      })
    }
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-[1480px] px-6 py-6 md:px-10 lg:px-12">
        <Skeleton className="mb-6 h-8 w-48 rounded-lg" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-[1480px] px-6 py-6 md:px-10 lg:px-12">
      <div className="mb-6 flex items-center justify-between gap-4">
        <SectionIntro
          eyebrow="Coach dashboard"
          title="Gestión del equipo"
          description="Coaches en tu equipo, invitaciones y roles."
        />
        <div className="flex items-center gap-3">
          {coaches.length > 0 && (
            <ViewModeToggle value={viewMode} onChange={setViewMode} storageKey="team-view-mode" />
          )}
          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="bg-accent hover:bg-accent-strong shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition"
          >
            + Invitar coach
          </button>
        </div>
      </div>

      {/* Invite form */}
      {showInviteForm && (
        <div className="border-accent/30 bg-accent/5 mb-6 rounded-2xl border p-5">
          <h3 className="mb-4 font-semibold">Invitar coach al equipo</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1 sm:col-span-2">
              <label htmlFor={`${formId}-email`} className="text-foreground/70 text-sm font-medium">
                Email
              </label>
              <input
                id={`${formId}-email`}
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="coach@example.com"
                className="border-line bg-surface-strong focus:border-accent w-full rounded-xl border px-3 py-2.5 text-sm transition outline-none"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor={`${formId}-role`} className="text-foreground/70 text-sm font-medium">
                Rol
              </label>
              <select
                id={`${formId}-role`}
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'MEMBER')}
                className="border-line bg-surface-strong focus:border-accent w-full rounded-xl border px-3 py-2.5 text-sm transition outline-none"
              >
                <option value="MEMBER">Miembro</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail}
              className="bg-accent hover:bg-accent-strong rounded-full px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-50"
            >
              {inviting ? 'Invitando...' : 'Enviar invitación'}
            </button>
            <button
              onClick={() => setShowInviteForm(false)}
              className="border-line text-foreground/70 hover:text-foreground rounded-full border px-5 py-2 text-sm font-medium transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Coaches list */}
      {coaches.length === 0 ? (
        <div className="border-line bg-surface/50 rounded-2xl border border-dashed p-12 text-center">
          <p className="text-foreground/50">Sin coaches en el equipo aún.</p>
          <button
            onClick={() => setShowInviteForm(true)}
            className="bg-accent hover:bg-accent-strong mt-4 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition"
          >
            Invitar primer coach
          </button>
        </div>
      ) : viewMode === 'table' ? (
        // TABLE VIEW
        <div className="border-line bg-surface-strong overflow-hidden rounded-2xl border">
          <div className="border-line text-foreground/40 hidden grid-cols-[1fr_120px_auto] gap-4 border-b px-5 py-2.5 text-[11px] tracking-widest uppercase sm:grid">
            <span>Coach</span>
            <span>Rol</span>
            <span></span>
          </div>
          <div className="divide-line divide-y">
            {coaches.map((coach) => (
              <div
                key={coach.coachId}
                className="hover:bg-background/40 grid grid-cols-1 items-center gap-3 px-5 py-3.5 transition sm:grid-cols-[1fr_120px_auto]"
              >
                {/* Coach info */}
                <div>
                  <p className="text-sm font-semibold">{coach.displayName}</p>
                  <p className="text-foreground/50 text-xs">{coach.email}</p>
                  {coach.phone && <p className="text-foreground/50 text-xs">{coach.phone}</p>}
                </div>
                {/* Role badge */}
                <span
                  className={`hidden w-fit rounded-full px-3 py-1 text-xs font-semibold sm:inline-block ${
                    coach.role === 'ADMIN'
                      ? 'bg-accent/15 text-accent'
                      : 'bg-foreground/10 text-foreground/60'
                  }`}
                >
                  {coach.role === 'ADMIN' ? 'Admin' : 'Miembro'}
                </span>
                {/* Actions */}
                <div className="flex items-center gap-2">
                  {selectedCoachId === coach.coachId ? (
                    <div className="flex gap-2">
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as 'ADMIN' | 'MEMBER')}
                        className="border-line bg-surface-strong rounded-lg border px-2 py-1 text-xs outline-none"
                      >
                        <option value="MEMBER">Miembro</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                      <button
                        onClick={() => handleChangeRole(coach.coachId, newRole)}
                        disabled={updating}
                        className="bg-success hover:bg-success/90 rounded-lg px-3 py-1 text-xs font-semibold text-white transition disabled:opacity-50"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => setSelectedCoachId(null)}
                        className="border-line hover:bg-surface rounded-lg border px-3 py-1 text-xs font-medium transition"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setSelectedCoachId(coach.coachId)
                          setNewRole(coach.role)
                        }}
                        className="border-line text-foreground/60 hover:text-accent rounded-lg border px-2.5 py-1 text-xs transition"
                      >
                        Cambiar rol
                      </button>
                      <button
                        onClick={() => handleRemove(coach.coachId)}
                        className="border-danger/30 text-danger hover:bg-danger/10 rounded-lg border px-2.5 py-1 text-xs font-medium transition"
                      >
                        Remover
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // LIST VIEW
        <div className="space-y-2">
          {coaches.map((coach) => (
            <div
              key={coach.coachId}
              className="border-line bg-surface-strong hover:border-accent/30 hover:bg-background/50 flex items-center justify-between gap-4 rounded-2xl border p-4 transition"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{coach.displayName}</p>
                <p className="text-foreground/50 text-xs">{coach.email}</p>
                {coach.phone && <p className="text-foreground/50 text-xs">{coach.phone}</p>}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      coach.role === 'ADMIN'
                        ? 'bg-accent/15 text-accent'
                        : 'bg-foreground/10 text-foreground/60'
                    }`}
                  >
                    {coach.role === 'ADMIN' ? 'Admin' : 'Miembro'}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {selectedCoachId === coach.coachId ? (
                  <div className="flex gap-2">
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as 'ADMIN' | 'MEMBER')}
                      className="border-line bg-surface-strong rounded-lg border px-2 py-1 text-xs outline-none"
                    >
                      <option value="MEMBER">Miembro</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    <button
                      onClick={() => handleChangeRole(coach.coachId, newRole)}
                      disabled={updating}
                      className="bg-success hover:bg-success/90 rounded-lg px-3 py-1 text-xs font-semibold text-white transition disabled:opacity-50"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => setSelectedCoachId(null)}
                      className="border-line hover:bg-surface rounded-lg border px-3 py-1 text-xs font-medium transition"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setSelectedCoachId(coach.coachId)
                        setNewRole(coach.role)
                      }}
                      className="border-line text-foreground/60 hover:text-accent rounded-lg border px-3 py-1.5 text-xs transition"
                    >
                      Cambiar rol
                    </button>
                    <button
                      onClick={() => handleRemove(coach.coachId)}
                      className="border-danger/30 text-danger hover:bg-danger/10 rounded-lg border px-3 py-1.5 text-xs font-medium transition"
                    >
                      Remover
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-4 font-semibold">Invitaciones pendientes</h3>
          <div className="space-y-2">
            {invites
              .filter((i) => !i.acceptedAt)
              .map((invite) => (
                <div
                  key={invite.id}
                  className="border-warning/30 bg-warning/5 flex items-center justify-between gap-4 rounded-xl border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{invite.invitedEmail}</p>
                    <p className="text-foreground/50 text-xs">
                      Expira {new Date(invite.expiresAt).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                  <span className="text-warning/70 text-xs">Pendiente</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </main>
  )
}
