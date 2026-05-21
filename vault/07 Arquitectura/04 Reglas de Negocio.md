# 04 — Reglas de Negocio

Reglas que el sistema debe garantizar. Indica en qué capa vive cada regla.

## Capas

- **Frontend (UX)**: validación inmediata, hint visual, no es fuente de verdad.
- **API (Zod)**: forma de entrada, tipos, rangos.
- **Service (lógica)**: invariantes de dominio, transacciones, transiciones de estado.
- **BD (Prisma + DB constraints)**: integridad referencial, unicidad, índices.

**Regla**: no duplicar la **misma** validación en dos capas salvo que el coste sea trivial (e.g. required field).

## Bloques de reglas por dominio

### Identity & Access

| Regla | Capa |
|---|---|
| Email único | BD `@unique` + Zod email |
| Password ≥ 8 chars, 1 mayús, 1 número | Zod + UI hint |
| 2FA: 5 intentos máx en 5 min | Service (rate limit) |
| Verificación email obligatoria para login | Service |
| Sesión expira en 7 días | NextAuth config |

### Teams

| Regla | Capa |
|---|---|
| Usuario debe pertenecer a team para acceder a sus recursos | Service (`requireTeamMembership`) |
| Solo ADMIN puede invitar/modificar roles/facturación | Service |
| Mínimo 1 ADMIN por team siempre | Service (validar antes de bajar rol) |
| Slug team único e inmutable | BD + Service |

### Athletes

| Regla | Capa |
|---|---|
| Atleta solo accede a sus propios datos | Service (`assertAthleteAccess`) |
| Coach accede solo a atletas de sus teams | Service |
| `Athlete.coachId` debe pertenecer al mismo team | Service (validar en update) |
| `birthdate` no en futuro, edad 12-99 | Zod |
| Cambio de team requiere transferencia explícita (planes archivados) | Service |

### Training

| Regla | Capa |
|---|---|
| Solo un `TrainingPlan` con `status=ACTIVE` por atleta | Service (transacción: al activar otro, anterior → ARCHIVED) |
| Editar plan ACTIVE genera nueva versión, no muta | Service (versionado) |
| `SessionLog` inmutable pasadas 24h | Service |
| `SetLog.weight ≥ 0`, `reps ≥ 0` | Zod |
| Borrar plan con `SessionLog` → soft delete | Service |
| Plantilla no puede ser ACTIVE | Service |
| `ExercisePrescription.order` único por sesión | Service (al reordenar, recalcular) |

### Nutrition

| Regla | Capa |
|---|---|
| Solo un `NutritionPlan` ACTIVE por atleta | Service |
| Jerarquía macros: `NutritionTarget` > `NutritionPlan.kcalTarget` > inferido | Service (helper `getEffectiveTargets(athleteId)`) |
| `MealFood.grams > 0`, macros ≥ 0 | Zod |
| `NutritionLog` inmutable pasadas 48h | Service (más permisivo que training) |
| Food custom solo visible al owner o team scope | Service |

### Progress

| Regla | Capa |
|---|---|
| `CheckIn` semanal: máx 1 por `(athleteId, weekStart)` | BD `@@unique` |
| `DailyLog` máx 1 por `(athleteId, date)` | BD `@@unique` |
| `BodyMeasurement` libre (puede haber varias por día) | — |
| `ProgressPhoto` URL siempre HTTPS, scope `private` | Service + storage |
| `coachNote` solo escribible por coach del atleta | Service |

### Communication

| Regla | Capa |
|---|---|
| Mensaje solo entre usuarios del mismo team | Service |
| `readAt` solo lo setea el destinatario | Service |
| Notification se marca leída solo por su `userId` | Service |
| Wall post visible solo a miembros del team | Service |

### Service Plans & Billing

| Regla | Capa |
|---|---|
| `ServicePlan` editable solo si no tiene `Subscription` activa (sino versionar) | Service |
| `Subscription.endDate` calculada desde `startDate + durationDays` | Service |
| Cancelar suscripción no borra histórico | Service |
| Solo ADMIN del team gestiona `BillingPlan` | Service |

### Dashboard

| Regla | Capa |
|---|---|
| Layout privado por usuario | BD `@@unique([userId, role])` |
| Si `userId` no tiene layout → usar `DashboardPreset` por rol | Service |

### Audit

| Regla | Capa |
|---|---|
| Toda mutación crítica (planes, perfil, facturación, miembros) genera `AuditLog` | Service (`auditMutation`) |
| `AuditLog` inmutable, sin update/delete | Service |

## Helpers de dominio a implementar

Centralizar reglas repetidas en `src/lib/domain-rules/`:

```ts
// src/lib/domain-rules/training.ts
export async function activatePlan(planId: string, tx: Prisma.TransactionClient) {
  const plan = await tx.trainingPlan.findUniqueOrThrow({ where: { id: planId }});
  // Archivar plan activo anterior
  await tx.trainingPlan.updateMany({
    where: { athleteId: plan.athleteId, status: 'ACTIVE', id: { not: planId } },
    data: { status: 'ARCHIVED' },
  });
  return tx.trainingPlan.update({ where: { id: planId }, data: { status: 'ACTIVE' }});
}

export async function createPlanVersion(prevId: string, payload, tx) {
  const prev = await tx.trainingPlan.findUniqueOrThrow({ where: { id: prevId }});
  await tx.trainingPlan.update({ where: { id: prevId }, data: { status: 'ARCHIVED' }});
  return tx.trainingPlan.create({
    data: { ...payload, parentPlanId: prevId, version: prev.version + 1, status: 'ACTIVE' },
  });
}
```

```ts
// src/lib/domain-rules/nutrition.ts
export async function getEffectiveTargets(athleteId: string) {
  const target = await prisma.nutritionTarget.findFirst({
    where: { athleteId, OR: [{ endDate: null }, { endDate: { gte: new Date() }}] },
    orderBy: { startDate: 'desc' },
  });
  if (target) return target;
  const plan = await prisma.nutritionPlan.findFirst({
    where: { athleteId, status: 'ACTIVE' },
  });
  if (plan?.kcalTarget) return { kcal: plan.kcalTarget, p: plan.proteinTarget, c: plan.carbsTarget, f: plan.fatTarget };
  return null;
}
```

## Errores de negocio (BusinessError)

Crear clase única:

```ts
// src/lib/errors.ts
export class BusinessError extends Error {
  constructor(message: string, public code: string, public status = 400) {
    super(message);
  }
}
```

En endpoints:

```ts
try { ... } catch (e) {
  if (e instanceof BusinessError) {
    return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
  }
  throw e;
}
```

Estandarizar en wrapper `apiHandler` (ver [[05 APIs y Arquitectura Tecnica]]).

## Resumen — reglas más críticas a implementar primero

1. **Versionado de planes** (training, nutrition).
2. **Único ACTIVE por atleta** (con transacción).
3. **Validar `coachId` pertenece a team del atleta**.
4. **Inmutabilidad de logs** tras ventana.
5. **Jerarquía de macros** centralizada.
6. **Mínimo 1 ADMIN por team**.
