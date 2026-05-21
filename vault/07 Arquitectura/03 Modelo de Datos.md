# 03 — Modelo de Datos

Visión de alto nivel del modelo Prisma actual + propuestas concretas de mejora.

## Principios

- **Una entidad por concepto**. Si dos entidades tienen ≥70% campos iguales, es una sola con discriminador.
- **Soft delete** (`deletedAt DateTime?`) en: `TrainingPlan`, `NutritionPlan`, `Athlete`, `Coach`, `Message`, `Document`.
- **Audit trail** completo via `AuditLog` (ya existe) — extender uso a todas las entidades con `auditMutation`.
- **Versionado** para entidades editables que necesitan historial: `TrainingPlan`, `NutritionPlan`, `ServicePlan`.

## Entidades núcleo (resumen)

### Identity
```
User (id, email, name, role, image, emailVerified, twoFactorEnabled)
  ├── Account (provider)
  ├── Session
  └── TwoFactor (secret, recoveryCodes)
```

### Tenant
```
Team (id, name, slug, settings)
  ├── TeamUserMembership (userId, teamId, role: ADMIN|MEMBER)
  ├── TeamSettings (theme, locale, billing config)
  ├── TeamContract (template)
  ├── TeamCatalog (goals, phases, tags)
  └── BillingPlan
```

### Perfiles
```
Coach (id 1:1 userId, bio, specialties, teamId opcional)
Athlete (id 1:1 userId?, teamId, coachId?, status, birthdate, sex, heightCm)
  ├── AthleteContextProfile (objetivos, historial, lesiones)
  ├── AthleteContextGymMachine (máquinas disponibles)
  ├── Consent (tipo, aceptado, fecha)
  └── HealthConnection (proveedor, token)
```

### Training
```
TrainingPlan (id, athleteId, coachId, title, block, status, version, parentPlanId?, startDate, endDate, deletedAt)
  └── WorkoutSession (id, planId, dayIndex, title, notes)
        └── ExercisePrescription (id, sessionId, exerciseCatalogId, sets, reps, rir, tempo, technique, order)

SessionLog (id, athleteId, planId, sessionId, planVersion, date, durationMin)
  └── SetLog (id, sessionLogId, exercisePrescriptionId, setIndex, weight, reps, rir)

ExerciseCatalog (id, slug, name, muscleGroups, equipment, isCustom, teamId?, ownerId?)
ExerciseNote (id, athleteId, exerciseCatalogId, note)
FavoriteExercise (userId, exerciseCatalogId)
PlanTemplate (id, ownerId, teamId, title, payload Json) -- snapshot reutilizable
```

### Nutrition
```
NutritionPlan (id, athleteId, coachId, title, status, version, parentPlanId?, kcalTarget?, deletedAt)
  └── Meal (id, planId, order, name, time?)
        └── MealFood (id, mealId, foodId, grams, kcal, p, c, f)

NutritionLog (id, athleteId, date, meals Json) -- snapshot de lo comido
NutritionTarget (id, athleteId, kcal, p, c, f, startDate, endDate?) -- objetivos puntuales
NutritionTemplate (id, ownerId, teamId, payload Json)
FoodCatalog (id, source: MFP|WGER|OFF|LOCAL, externalId, name, macros, isCustom, ownerId?)
FavoriteFood (userId, foodId)
```

### Progress
```
CheckIn (id, athleteId, weekStart, weightKg, sleep, energy, photos[], coachNote?, coachReviewedAt?)
DailyLog (id, athleteId, date, weightKg?, mood, steps?, waterMl?)
BodyMeasurement (id, athleteId, date, weightKg?, bodyFatPct?, chestCm?, waistCm?, ...)
ProgressPhoto (id, athleteId, date, url, view: FRONT|SIDE|BACK)
```

### Communication
```
Message (id, fromUserId, toUserId, body, readAt, createdAt)
Notification (id, userId, type, entityType, entityId, payload Json, readAt)
WallPost (id, teamId, authorId, body, attachments)
Document (id, ownerId, kind: CONTRACT|PDF, url, signedBy[])
```

### Service & Billing
```
ServicePlan (id, coachId, teamId, title, durationDays, price, featuresJson, version, deletedAt)
Subscription (id, athleteId, servicePlanId, startDate, endDate, autoRenew, status)
```

### Sistema
```
AuditLog (id, userId, entity, entityId, action, before Json, after Json, createdAt)
DashboardLayout (id, userId, role, widgets Json)
DashboardPreset (id, role, name, widgets Json)
```

## Cambios propuestos al schema

### 1. Versionado de planes (training, nutrition, service)

```prisma
model TrainingPlan {
  // ...existing...
  version       Int      @default(1)
  parentPlanId  String?  // si es nueva versión, apunta a la anterior
  parent        TrainingPlan? @relation("PlanVersions", fields: [parentPlanId], references: [id])
  children      TrainingPlan[] @relation("PlanVersions")

  @@index([athleteId, status, version])
}
```

Mismo patrón en `NutritionPlan`, `ServicePlan`.

### 2. Soft delete consistente

```prisma
model Athlete { deletedAt DateTime? @@index([deletedAt]) }
model Coach { deletedAt DateTime? }
model TrainingPlan { deletedAt DateTime? }
model NutritionPlan { deletedAt DateTime? }
```

Wrapper en services: filtrar siempre `deletedAt: null` salvo endpoints de papelera.

### 3. Estado normalizado

Reemplazar booleanos sueltos (`isActive`, `isArchived`, ...) por enum:

```prisma
enum PlanStatus { DRAFT ACTIVE ARCHIVED }

model TrainingPlan { status PlanStatus @default(DRAFT) }
model NutritionPlan { status PlanStatus @default(DRAFT) }
```

### 4. Inmutabilidad de SessionLog/NutritionLog

Añadir constraint a nivel servicio: ningún `PATCH` permitido pasadas 24h de `createdAt`. Validar en endpoint.

### 5. Índices de performance (estimado por queries actuales)

```prisma
@@index([athleteId, status, startDate]) // TrainingPlan listado activo
@@index([athleteId, date])              // SessionLog/NutritionLog rango fechas
@@index([teamId, status])               // Athlete listado por team
@@index([toUserId, readAt])             // Message inbox no leídos
@@index([userId, readAt, createdAt])    // Notification panel
@@index([entity, entityId, createdAt])  // AuditLog history
```

### 6. Constraints

```prisma
// Solo un plan ACTIVE por (athleteId)
@@unique([athleteId, status], name: "uniq_active_plan") // requiere filter parcial: vía service
```

MySQL no soporta unique parcial; aplicar en service layer + trigger opcional.

### 7. JSON tipado

Para `payload`, `widgets`, `featuresJson`, `meals` (en `NutritionLog`): definir tipos TS en `src/lib/domain.ts` y validar con Zod antes de persistir.

```ts
// src/lib/domain.ts
export type NutritionLogPayload = {
  meals: Array<{ time?: string; foods: Array<{ name; grams; kcal; p; c; f }> }>;
  totals: { kcal; p; c; f };
};
```

## Cambios propuestos a entidades

### `Coach` vs `TeamUserMembership`
- `Coach` = perfil profesional, **opcional**, sólo si el usuario expone biografía/specialties al atleta.
- `TeamUserMembership` = rol en team.
- Endpoint `/api/coach/me` debe componer ambos sin asumir relación 1:1.

### `Athlete.coachId` (legacy)
- Mantener como **fk opcional "coach principal asignado"**.
- Validar consistencia: `coachId` debe pertenecer al mismo `teamId`.

```ts
// service Athlete.update
if (data.coachId) {
  const coachInTeam = await prisma.teamUserMembership.findFirst({
    where: { userId: data.coachId, teamId: athlete.teamId }
  });
  if (!coachInTeam) throw new BusinessError("Coach no pertenece al team");
}
```

### Catálogos compartidos (`ExerciseCatalog`, `FoodCatalog`)
- Discriminador `scope`: `SYSTEM | TEAM | USER`.
- Búsquedas filtran por scope visible al usuario actual.

```prisma
enum CatalogScope { SYSTEM TEAM USER }
model ExerciseCatalog { scope CatalogScope; teamId String?; ownerId String? }
```

## Resumen — entidades a tocar primero

| Prioridad | Entidad | Cambio |
|---|---|---|
| Alta | `TrainingPlan`, `NutritionPlan` | enum `status`, `version`, `parentPlanId`, `deletedAt` |
| Alta | `SessionLog`, `NutritionLog` | añadir `planVersion` (snapshot del momento) |
| Media | `ExerciseCatalog`, `FoodCatalog` | enum `scope` unificado |
| Media | Índices | listado de `@@index` arriba |
| Baja | `Athlete.coachId` | validación de pertenencia a team |
