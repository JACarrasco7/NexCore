# 08 — Plan de Refactor (Pasos de Programación)

Orden de ejecución sugerido. Cada paso es independiente, incremental, no rompe lo existente. Marca ✅ cuando esté hecho.

## Fase 0 — Cimientos (1-2 días)

### 0.1 Crear errores y wrapper de handler
- Crear `src/lib/errors.ts` con `BusinessError`, `ApiError`.
- Crear `src/lib/api/api-handler.ts` con `apiHandler({ auth, handler, rateLimit })`.
- Migrar 3 endpoints piloto: `/api/plans`, `/api/nutrition-plans`, `/api/athletes`.
- **Test**: golden test asegurando shape de error consistente.

### 0.2 Estandarizar shape de respuesta
- Crear `src/lib/api/shape.ts` con helpers `okList({items,total,cursor})`, `okOne(entity)`.
- Auditar endpoints (~100): identificar los que devuelven wrappers ad-hoc (`{athletes:[]}`, `{plans:[]}`).
- Migrar progresivamente; `apiFetch` actual tolera ambos, no rompe.

### 0.3 Cliente API tipado en frontend
- Mantener `apiFetch`/`apiPost` en `src/lib/store.ts` (ya existen).
- Crear `src/lib/api-client/` con módulos por dominio: `training.ts`, `nutrition.ts`, `athletes.ts`, `teams.ts`, `messages.ts`, `notifications.ts`.
- **Regla**: ningún componente nuevo usa `fetch` directo. Migrar componentes existentes en sprints.

## Fase 1 — Domain layer (2-3 días)

### 1.1 Crear `src/lib/domain-rules/`
Archivos:
- `training.ts` — `activatePlan`, `createPlanVersion`, `archivePlan`.
- `nutrition.ts` — `getEffectiveTargets`, `activateNutritionPlan`, `createNutritionPlanVersion`.
- `athlete.ts` — `assignCoach`, `transferAthleteToTeam`.
- `team.ts` — `inviteMember`, `changeRole` (con validación min-1-admin).

Cada función:
- Recibe `Prisma.TransactionClient` para ser componible.
- No usa `NextResponse`. Lanza `BusinessError`.

### 1.2 Crear `src/lib/services/`
Wrappers que orquestan domain-rules + audit + side effects (notificaciones).

```ts
// src/lib/services/training.service.ts
export const trainingService = {
  async createPlan(input: PlanInput, session: Session) {
    return prisma.$transaction(async (tx) => {
      const plan = await tx.trainingPlan.create({ data: { ...input, version: 1, status: input.activateNow ? 'ACTIVE' : 'DRAFT' }});
      if (plan.status === 'ACTIVE') await domainRules.training.activatePlan(plan.id, tx);
      await auditMutation({ entity: 'TrainingPlan', entityId: plan.id, action: 'CREATE', after: plan, userId: session.user.id });
      await notify(plan.athlete.userId, 'NEW_PLAN', { planId: plan.id });
      return plan;
    });
  },
  // ...
};
```

### 1.3 Endpoints adelgazados
- Cada `route.ts` ≤ 30 líneas: auth → parse → call service → return.

## Fase 2 — Schema y migraciones (1 día)

⚠️ **NO ejecutar sin confirmación del usuario.** Solo preparar archivos.

### 2.1 Editar `prisma/schema.prisma`
- Añadir enum `PlanStatus`, `CatalogScope`, `AthleteStatus`.
- Añadir `version`, `parentPlanId`, `deletedAt` en `TrainingPlan`, `NutritionPlan`, `ServicePlan`.
- Añadir `planVersion` en `SessionLog`, `NutritionLog`.
- Añadir índices (ver [[03 Modelo de Datos]] §5).
- Añadir modelo `LlmCall`.

### 2.2 Generar migración
`npx prisma migrate dev --name arch_v2_versioning_status_indexes`

### 2.3 Script de backfill
- Asignar `status` a planes existentes desde booleanos legacy.
- `version=1`, `parentPlanId=null` para todos.

## Fase 3 — Permisos completos (1 día)

- Auditar cada endpoint con tabla de [[05 APIs y Arquitectura Tecnica]] §Autenticación.
- Añadir el helper mínimo donde falte.
- Test integración: cada endpoint write rechaza usuario sin permiso (403).

## Fase 4 — React Query + Hooks (3-4 días)

### 4.1 Instalar y configurar
- `npm install @tanstack/react-query @tanstack/react-query-devtools`
- `QueryClientProvider` en `app/layout.tsx`.

### 4.2 Migrar hooks de `store.ts`
- `useAthletes`, `useTrainingPlans`, `useNutritionPlans`, `useCheckIns`, `useDailyLogs`, `useSessionLogs`, `useServicePlans`.
- Cada uno → nuevo archivo en `src/lib/hooks/`.
- Devolver objeto `UseQueryResult<T>` directamente; consumidores actualizan.

### 4.3 Mutaciones
- `useCreatePlan`, `useUpdatePlan`, `useArchivePlan`, etc.
- Optimistic updates donde aplique (toggle favorite, mark notification read).

## Fase 5 — Refactor componentes gigantes (3-5 días)

### 5.1 `coach/nutrition/page.tsx`
- Extraer: `<NutritionPlanForm>`, `<MealBuilder>`, `<NutritionTemplatesPanel>`, `<FoodSearchPanel>`.
- Página: orquesta, no contiene UI específica.

### 5.2 `coach/plans/new/page.tsx`
- 3 archivos de step + hook `usePlanWizard`.

### 5.3 `floating-chat.tsx`
- Separar `<AthleteFloatingChat>` y `<CoachFloatingInbox>`.

## Fase 6 — Migración fetch → apiFetch (1-2 días)

Lista de archivos pendientes (de la auditoría previa):
- `src/components/notification-bell.tsx`
- `src/components/team-tags-admin.tsx`
- `src/components/team-phases-admin.tsx`
- `src/app/onboarding/page.tsx`
- `src/app/register/page.tsx`
- `src/app/verify-email/page.tsx`
- `src/app/2fa/*`
- `src/app/(athlete)/*` (varios)
- `src/app/(coach)/team/*`, `messages`, `settings`, `profile`, `athletes`, `import-lab/*`
- `src/lib/use-athlete-me.ts`

Pasos por archivo:
1. Importar `apiFetch`/`apiPost`/`apiPatch`/`apiDelete` desde `api-client/base`.
2. Sustituir `fetch('/api/x').then(r=>r.json())` por `apiFetch<T>('/api/x')`.
3. POST/PATCH/DELETE igual.
4. Validar tipos.

## Fase 7 — Performance (2-3 días)

### 7.1 Añadir índices (ver [[03 Modelo de Datos]])
### 7.2 Detectar N+1
- Auditar endpoints listado: usar `include` en una query, evitar map+findUnique.
- Ejemplo crítico: `/api/athletes` con últimos check-ins → usa `include: { checkIns: { take: 1, orderBy: { date: 'desc' }}}`.

### 7.3 Code splitting frontend
- `dynamic(() => import('@/components/domain/training/plan-form'))` en pages.

### 7.4 Virtualización
- `@tanstack/react-virtual` en listas atletas/logs > 100.

## Fase 8 — Tests (continuo)

### 8.1 Vitest + setup
- `npm install -D vitest @vitest/ui @testing-library/react jsdom`.
- `vitest.config.ts`.

### 8.2 Tests prioritarios
- `domain-rules/training.test.ts`: activatePlan archiva anterior.
- `domain-rules/nutrition.test.ts`: getEffectiveTargets jerarquía.
- `services/training.service.test.ts` con prisma mock.
- Helpers `assertAthleteAccess`, `requireTeamMembership`.

### 8.3 E2E Playwright (post Fase 5)
- Login coach → crear plan → asignar atleta.
- Login atleta → registrar sesión.
- Check-in flow.

## Fase 9 — Rate limit y observabilidad (1-2 días)

### 9.1 Rate limit
- Instalar `@upstash/ratelimit` + Redis (Upstash).
- Aplicar a `/api/auth/*`, `/api/register`, `/api/2fa/*`, search endpoints, import CSV.

### 9.2 Logger
- `pino` server-side.
- Wrapper en `apiHandler` para log estructurado.

### 9.3 Métricas
- Integrar con sink (Axiom/Logtail) o solo logs JSON por ahora.

## Fase 10 — Capa IA (preparación) (2-3 días)

Ver [[07 Automatizacion LLM]].

1. `src/lib/ai/` esqueleto.
2. Modelo `LlmCall` en schema.
3. `runLlm` con mock.
4. Endpoint piloto `/api/ai/parse-food`.
5. UI: botón "Parsear con IA" en `MealBuilder`.

## Orden mínimo recomendado

Si tiempo limitado, ejecutar **en este orden**:
1. Fase 0 (cimientos).
2. Fase 6 (migración fetch).
3. Fase 1 (domain layer).
4. Fase 3 (permisos).
5. Fase 2 (schema) ← requiere migración, **confirmar antes**.
6. Resto en paralelo.

## Checklist de "no romper"

Antes de cada commit grande:
- [ ] `npx tsc --noEmit` sin errores.
- [ ] `npx prisma validate` ok.
- [ ] Endpoints pilotos responden 200 en navegador.
- [ ] No introducir nuevos `fetch('/api/...')` directos.
- [ ] No introducir nuevos wrappers ad-hoc de listas.
- [ ] Cada nuevo endpoint write usa un helper de auth.

## Anexo — Comandos útiles

```bash
# Tipos
npx tsc --noEmit

# Prisma
npx prisma validate
npx prisma generate
npx prisma migrate dev --name <name>   # ⚠ confirmar con usuario antes

# Buscar fetch directos pendientes
rg "fetch\('/api/" src/

# Buscar request.json directos (debe ser solo json-parser.ts)
rg "request\.json\(\)" src/
```

> ⚠ Recordatorio: NO ejecutar `npm run build` ni migraciones sin confirmación explícita del usuario.
