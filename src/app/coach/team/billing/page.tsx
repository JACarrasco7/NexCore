'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PageShell, PageHeader } from '@/components/layout'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Skeleton } from '@/components/ui/skeleton'

interface Team {
  id: string
  name: string
  slug?: string
  role: 'ADMIN' | 'MEMBER'
}

interface BillingPlan {
  id: string
  planName: string
  description?: string
  price: number
  currency: string
  billingCycle: 'MONTHLY' | 'YEARLY' | 'ONE_TIME'
  maxAthletes?: number
  isActive: boolean
  createdAt: string
}

export default function TeamBillingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [billingPlans, setBillingPlans] = useState<BillingPlan[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Formulario
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<{
    planName: string
    description: string
    price: number | string
    currency: string
    billingCycle: 'MONTHLY' | 'YEARLY' | 'ONE_TIME'
    maxAthletes: string
  }>({
    planName: '',
    description: '',
    price: 0,
    currency: 'EUR',
    billingCycle: 'MONTHLY',
    maxAthletes: '',
  })

  // Cargar equipos
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await fetch('/api/teams')
        if (!res.ok) throw new Error('Error cargando equipos')
        const data: Team[] = await res.json()
        setTeams(data)

        const teamIdParam = searchParams.get('teamId')
        const defaultTeamId = teamIdParam || (data[0]?.id ?? null)
        setSelectedTeamId(defaultTeamId)

        if (defaultTeamId) {
          await fetchBillingPlans(defaultTeamId)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }

    fetchTeams()
  }, [searchParams])

  // Cargar planes de facturación
  const fetchBillingPlans = async (teamId: string) => {
    try {
      const res = await fetch(`/api/teams/${teamId}/billing-plans`)
      if (!res.ok) throw new Error('Error cargando planes de facturación')
      const data: BillingPlan[] = await res.json()
      setBillingPlans(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    }
  }

  // Cambiar equipo
  const handleTeamChange = async (teamId: string) => {
    setSelectedTeamId(teamId)
    router.push(`/coach/team/billing?teamId=${teamId}`)
    await fetchBillingPlans(teamId)
  }

  // Guardar plan
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTeamId) {
      setError('Selecciona un equipo')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const method = editingId ? 'PUT' : 'POST'
      const url = editingId
        ? `/api/teams/${selectedTeamId}/billing-plans/${editingId}`
        : `/api/teams/${selectedTeamId}/billing-plans`

      const payload = {
        planName: formData.planName,
        description: formData.description || null,
        price: parseFloat(formData.price.toString()),
        currency: formData.currency,
        billingCycle: formData.billingCycle,
        maxAthletes: formData.maxAthletes ? parseInt(formData.maxAthletes) : null,
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Error guardando plan')
      }

      setSuccess(editingId ? 'Plan actualizado' : 'Plan creado')
      setShowForm(false)
      setEditingId(null)
      setFormData({
        planName: '',
        description: '',
        price: 0,
        currency: 'EUR',
        billingCycle: 'MONTHLY',
        maxAthletes: '',
      })

      await fetchBillingPlans(selectedTeamId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSaving(false)
    }
  }

  // Editar plan
  const handleEditPlan = (plan: BillingPlan) => {
    setFormData({
      planName: plan.planName,
      description: plan.description || '',
      price: plan.price,
      currency: plan.currency,
      billingCycle: plan.billingCycle,
      maxAthletes: plan.maxAthletes?.toString() || '',
    })
    setEditingId(plan.id)
    setShowForm(true)
  }

  // Eliminar plan
  const handleDeletePlan = async (planId: string) => {
    if (!selectedTeamId) return
    if (!confirm('¿Eliminar este plan de facturación?')) return

    try {
      const res = await fetch(`/api/teams/${selectedTeamId}/billing-plans/${planId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Error eliminando plan')

      setSuccess('Plan eliminado')
      await fetchBillingPlans(selectedTeamId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    }
  }

  // Cancelar edición
  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({
      planName: '',
      description: '',
      price: 0,
      currency: 'EUR',
      billingCycle: 'MONTHLY',
      maxAthletes: '',
    })
  }

  if (loading) {
    return (
      <PageShell>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </PageShell>
    )
  }

  const canManageBilling = teams.find((t) => t.id === selectedTeamId)?.role === 'ADMIN'

  return (
    <PageShell>
      <PageHeader
        eyebrow="Team"
        title="Facturación del equipo"
        description="Gestiona los planes de facturación"
        back={{ href: '/coach/team', label: 'Volver' }}
      />

      {error && <AlertBanner variant="error">{error}</AlertBanner>}
      {success && <AlertBanner variant="success">{success}</AlertBanner>}

      {teams.length > 1 && (
        <div>
          <label className="text-foreground/60 mb-2 block text-sm font-medium">Equipo</label>
          <select
            value={selectedTeamId || ''}
            onChange={(e) => handleTeamChange(e.target.value)}
            className="border-line bg-surface-strong focus:border-accent rounded-2xl border px-4 py-2.5 text-sm outline-none"
          >
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {!canManageBilling && (
        <AlertBanner variant="warning">
          No tienes permisos para gestionar la facturación de este equipo.
        </AlertBanner>
      )}

      {showForm && canManageBilling && (
        <div className="border-line bg-surface rounded-2xl border p-6">
          <h2 className="text-foreground mb-4 text-lg font-semibold">
            {editingId ? 'Editar plan' : 'Nuevo plan'}
          </h2>
          <form onSubmit={handleSavePlan} className="space-y-4">
            <div>
              <label className="text-foreground/60 mb-2 block text-sm font-medium">
                Nombre del plan *
              </label>
              <input
                type="text"
                value={formData.planName}
                onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
                placeholder="Ej: Plan básico"
                className="border-line bg-surface-strong focus:border-accent w-full rounded-2xl border px-4 py-2.5 text-sm outline-none"
                required
              />
            </div>

            <div>
              <label className="text-foreground/60 mb-2 block text-sm font-medium">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción del plan"
                className="border-line bg-surface-strong focus:border-accent w-full rounded-2xl border px-4 py-2.5 text-sm outline-none"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-foreground/60 mb-2 block text-sm font-medium">
                  Precio *
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0.00"
                  step="0.01"
                  className="border-line bg-surface-strong focus:border-accent w-full rounded-2xl border px-4 py-2.5 text-sm outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-foreground/60 mb-2 block text-sm font-medium">Moneda</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="border-line bg-surface-strong focus:border-accent w-full rounded-2xl border px-4 py-2.5 text-sm outline-none"
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-foreground/60 mb-2 block text-sm font-medium">
                  Ciclo de facturación *
                </label>
                <select
                  value={formData.billingCycle}
                  onChange={(e) => {
                    const value = e.target.value as 'MONTHLY' | 'YEARLY' | 'ONE_TIME'
                    setFormData({ ...formData, billingCycle: value })
                  }}
                  className="border-line bg-surface-strong focus:border-accent w-full rounded-2xl border px-4 py-2.5 text-sm outline-none"
                >
                  <option value="MONTHLY">Mensual</option>
                  <option value="YEARLY">Anual</option>
                  <option value="ONE_TIME">De una sola vez</option>
                </select>
              </div>

              <div>
                <label className="text-foreground/60 mb-2 block text-sm font-medium">
                  Máximo de atletas
                </label>
                <input
                  type="number"
                  value={formData.maxAthletes}
                  onChange={(e) => setFormData({ ...formData, maxAthletes: e.target.value })}
                  placeholder="Sin límite"
                  className="border-line bg-surface-strong focus:border-accent w-full rounded-2xl border px-4 py-2.5 text-sm outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="bg-accent rounded-2xl px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="border-line bg-surface-strong text-foreground hover:bg-background rounded-2xl border px-4 py-2.5 text-sm font-medium"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de planes */}
      <div className="space-y-3">
        {canManageBilling && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-accent rounded-2xl px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            + Nuevo plan
          </button>
        )}

        {billingPlans.length === 0 ? (
          <div className="border-line bg-surface text-foreground/50 rounded-2xl border p-6 text-center">
            {canManageBilling
              ? 'Sin planes de facturación. Crea uno para comenzar.'
              : 'Sin planes de facturación.'}
          </div>
        ) : (
          <div className="grid gap-4">
            {billingPlans.map((plan) => (
              <div key={plan.id} className="border-line bg-surface rounded-2xl border p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-foreground text-lg font-semibold">{plan.planName}</h3>
                      {!plan.isActive && (
                        <span className="border-danger/30 bg-danger/10 text-danger rounded-full border px-2 py-0.5 text-xs">
                          Inactivo
                        </span>
                      )}
                    </div>
                    {plan.description && (
                      <p className="text-foreground/60 mt-2 text-sm">{plan.description}</p>
                    )}
                    <div className="mt-3 flex gap-6 text-sm">
                      <div>
                        <span className="text-foreground/60">Precio:</span>
                        <span className="text-foreground ml-2 font-medium">
                          {plan.price.toFixed(2)} {plan.currency}
                        </span>
                      </div>
                      <div>
                        <span className="text-foreground/60">Ciclo:</span>
                        <span className="text-foreground ml-2 font-medium">
                          {plan.billingCycle === 'MONTHLY'
                            ? 'Mensual'
                            : plan.billingCycle === 'YEARLY'
                              ? 'Anual'
                              : 'De una sola vez'}
                        </span>
                      </div>
                      {plan.maxAthletes && (
                        <div>
                          <span className="text-foreground/60">Atletas max:</span>
                          <span className="text-foreground ml-2 font-medium">
                            {plan.maxAthletes}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {canManageBilling && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditPlan(plan)}
                        className="bg-surface-strong text-accent hover:bg-surface-strong/80 rounded-lg px-3 py-1.5 text-xs font-medium"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeletePlan(plan.id)}
                        className="border-danger/30 text-danger hover:bg-danger/10 rounded-lg border px-3 py-1.5 text-xs font-medium transition"
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  )
}
