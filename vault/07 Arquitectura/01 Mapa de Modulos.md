# 01 — Mapa de Módulos y Dominios

Vista de alto nivel del sistema. Cada módulo es un **bounded context**: encapsula entidades, reglas y endpoints. Comunicación entre módulos solo por IDs o eventos de dominio.

## Módulos principales

### 1. Identity & Access
**Propósito**: registro, login, sesión, MFA, recuperación.
- Entidades: `User`, `Account`, `Session`, `VerificationToken`, `TwoFactor`.
- Relaciones: 1 `User` → 0..1 `Coach`, 0..1 `Athlete`.
- Endpoints: `/api/auth/*`, `/api/register`, `/api/2fa/*`, `/api/verify/*`, `/api/otp/*`.
- **Riesgo actual**: lógica de OTP dispersa en `/api/auth/otp/*` y `/api/otp/*` → unificar.

### 2. Teams (Multi-tenant)
**Propósito**: contenedor de coaches + atletas. Facturación y catálogos viven aquí.
- Entidades: `Team`, `TeamUserMembership` (role ADMIN/MEMBER), `TeamSettings`, `TeamContract`.
- Relaciones: N `User` ↔ M `Team` via `TeamUserMembership`. 1 `Team` → N `Athlete`.
- Endpoints: `/api/teams`, `/api/teams/[teamId]/*`, `/api/teams/catalog/*`.
- **Regla clave**: todo acceso tenant-scoped pasa por `requireTeamMembership`.

### 3. Coaches
**Propósito**: perfil profesional del entrenador.
- Entidades: `Coach` (1:1 con `User`).
- Endpoints: `/api/me/coach`, `/api/teams/coaches/*`.
- **Riesgo**: la entidad `Coach` casi duplica `TeamUserMembership` para coaches. Mantener `Coach` como **perfil profesional** y `TeamUserMembership` como **rol en team**.

### 4. Athletes
**Propósito**: perfil del atleta + contexto biométrico estático.
- Entidades: `Athlete`, `AthleteContextProfile`, `AthleteContextGymMachine`, `HealthConnection`, `Consent`.
- Relaciones: 1 `Athlete` → 1 `Team`, 1 `Athlete` → 0..1 `Coach` (legacy), 1 → N `BodyMeasurement`, N `CheckIn`, N `DailyLog`.
- Endpoints: `/api/athletes`, `/api/athletes/[id]/*`, `/api/me/athlete`.
- **Sobrecarga detectada**: `athletes/[id]/route.ts` mezcla perfil + contexto + relaciones. Dividir en sub-recursos.

### 5. Training (Planes de entrenamiento)
**Propósito**: prescripción de entrenamiento y registro de sesiones.
- Entidades:
  - `TrainingPlan` (alias del legacy `Plan`)
  - `WorkoutSession` (sesión dentro del plan)
  - `ExercisePrescription`
  - `SessionLog` + `SetLog` (registro real ejecutado)
  - `ExerciseCatalog`, `ExerciseNote`, `FavoriteExercise`
  - `PlanTemplate` (plantillas reutilizables)
- Relaciones: 1 `Athlete` → N `TrainingPlan` → N `WorkoutSession` → N `ExercisePrescription`. 1 `Athlete` → N `SessionLog` → N `SetLog`.
- Endpoints: `/api/plans`, `/api/plans/[id]`, `/api/plans/[id]/save-as-template`, `/api/session-logs`, `/api/exercises/*`, `/api/exercise-notes`, `/api/favorites/exercises`.
- **Decisión clave**: `block` ya movido a nivel `TrainingPlan`. Mantener así.

### 6. Nutrition (Planes de nutrición)
**Propósito**: prescripción nutricional y registro de comidas.
- Entidades:
  - `NutritionPlan` → N `Meal` → N `MealFood`
  - `NutritionLog` (registro diario del atleta)
  - `NutritionTarget` (objetivos macro independientes del plan)
  - `NutritionTemplate` (plantillas reutilizables)
  - `FoodCatalog` (proxy MFP/local), `FavoriteFood`
- Relaciones: paralelo a Training. 1 `Athlete` → N `NutritionPlan`.
- Endpoints: `/api/nutrition-plans`, `/api/nutrition-logs`, `/api/nutrition-templates`, `/api/nutrition-targets`, `/api/food-catalog`.
- **Riesgo**: hay 3 fuentes de macros (plan, target, log). Definir prioridad: `target` > `plan` > inferido del `log`.

### 7. Progress & Body
**Propósito**: tracking de cuerpo y progreso.
- Entidades: `CheckIn`, `BodyMeasurement`, `DailyLog`, `ProgressPhoto`.
- Endpoints: `/api/check-ins`, `/api/body-measurements`, `/api/daily-logs`, `/api/progress-photos`.
- **Regla**: `CheckIn` es semanal/quincenal (con `coachNote`); `DailyLog` es diario simple; `BodyMeasurement` es medición puntual con múltiples campos.

### 8. Communication
**Propósito**: mensajería, notificaciones, wall del equipo.
- Entidades: `Message`, `Notification`, `WallPost`, `Document` (PDFs/contratos firmables).
- Endpoints: `/api/messages/*`, `/api/notifications/*`, `/api/coach/inbox`, `/api/teams/wall`, `/api/documents/*`.
- **Sobrecarga**: `floating-chat.tsx` mezcla inbox de coach con vista de atleta. Separar componentes.

### 9. Service Plans & Billing
**Propósito**: planes que se **cobran** (no confundir con planes de entrenamiento).
- Entidades: `ServicePlan` (oferta del coach), `BillingPlan` (suscripción del team), `Subscription` (atleta ↔ servicePlan).
- Endpoints: `/api/service-plans/*`, `/api/teams/[teamId]/billing-plans/*`, `/api/athletes/[id]/subscriptions`.

### 10. Dashboard & Analytics
**Propósito**: vista consolidada y métricas.
- Entidades: `DashboardLayout`, `DashboardPreset`, `AuditLog`.
- Endpoints: `/api/dashboard/layout`, `/api/dashboard/preset`, `/api/athletes/compare`.
- **Decisión**: dashboard NO debería tener endpoints propios de datos; solo configuración de layout. Los datos los pide cada widget a su endpoint de dominio.

### 11. Import / Lab
**Propósito**: herramienta separada de import CSV (training, nutrition).
- Endpoints: `/api/plans/templates`, `/api/nutrition-templates`.
- **Mantener separado** del flujo normal de creación.

## Mapa de dependencias

```
Identity ──> Teams ──> Coaches
                  └──> Athletes ──> Training
                                ├──> Nutrition
                                ├──> Progress
                                └──> Subscriptions ──> ServicePlans (Billing)
        Communication ──> usa User/Athlete/Team
        Dashboard ──> agrega lecturas de todos
```

## Módulos sobrecargados (a dividir)

| Módulo actual | Problema | Acción |
|---|---|---|
| `/api/athletes/[id]` | Mezcla perfil, contexto, salud, consents | Mantener perfil aquí; mover contexto/consents a sub-rutas (ya parcial) |
| `/api/auth/*` + `/api/otp/*` + `/api/verify/*` | OTP en 3 sitios | Unificar bajo `/api/auth/otp/*` |
| `coach/nutrition/page.tsx` (~1200 líneas) | Editor + listado + aside | Separar: `<PlanList>`, `<PlanForm>`, `<NutritionEditorPage>` |
| `coach/plans/new/page.tsx` | Wizard + cargas + templates | Extraer `<Step1>`, `<Step2>`, `<Step3>` a archivos propios |
| `store.ts` | Hooks de todas las entidades | Dividir por dominio: `store/athletes.ts`, `store/training.ts`, etc. |

## Convenciones de nombres

- **Planes de entrenamiento** = `TrainingPlan` (UI: "Rutina" o "Plan de entrenamiento").
- **Planes de nutrición** = `NutritionPlan` (UI: "Plan nutricional").
- **Planes de servicio** = `ServicePlan` (UI: "Plan", lo que se cobra).
- **Import CSV** = herramienta separada bajo `/coach/import-lab/*`.
