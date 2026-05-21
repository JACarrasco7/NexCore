# 05 — APIs, Paquetes y Arquitectura Técnica

## Estructura de carpetas propuesta

```
src/
  app/                    -- rutas Next App Router (sólo I/O)
    api/
      [dominio]/
        route.ts          -- handlers GET/POST (delgados)
        [id]/route.ts
  lib/
    api/                  -- helpers comunes
      auth-helpers.ts
      json-parser.ts
      audit.ts
      pagination.ts
      api-handler.ts      -- NUEVO: wrapper estándar
      shape.ts            -- NUEVO: helpers de respuesta
    domain-rules/         -- NUEVO: reglas puras por dominio
      training.ts
      nutrition.ts
      athlete.ts
      team.ts
    services/             -- NUEVO: orquestación (Prisma + reglas + audit)
      training.service.ts
      nutrition.service.ts
      athlete.service.ts
      ...
    validators/           -- Zod schemas (ya existe)
    domain.ts             -- tipos TS de dominio
    db.ts                 -- prisma client
    errors.ts             -- BusinessError, ApiError
    api-client/           -- NUEVO: cliente para frontend
      base.ts             -- apiFetch / apiPost / apiPatch / apiDelete
      training.ts         -- funciones tipadas: listPlans, createPlan...
      nutrition.ts
      ...
    hooks/                -- NUEVO: hooks de datos (SWR/React Query)
      use-athletes.ts
      use-training-plans.ts
      ...
```

**Razón**: separar I/O (route) de lógica (service) de reglas puras (domain-rules). Tests sólo necesitan service + domain-rules.

## Patrón estándar de endpoint

### Wrapper `apiHandler`

```ts
// src/lib/api/api-handler.ts
import { NextRequest, NextResponse } from 'next/server';
import { BusinessError } from '../errors';
import { ZodError } from 'zod';

type Ctx = { params: Record<string,string>; session: Session; };
type Handler<T> = (req: NextRequest, ctx: Ctx) => Promise<T>;

export function apiHandler<T>(opts: {
  auth: 'session' | 'admin' | 'coach' | 'athlete' | 'public';
  handler: Handler<T>;
  rateLimit?: { per: number; window: number };
}) {
  return async (req: NextRequest, { params }: { params: Promise<Record<string,string>> }) => {
    try {
      const resolvedParams = await params;
      const session = opts.auth === 'public' ? null : await requireSession();
      // rate limit, role checks...
      const data = await opts.handler(req, { params: resolvedParams, session });
      return NextResponse.json(data);
    } catch (e) {
      if (e instanceof ZodError) return NextResponse.json({ error: 'validation', issues: e.issues }, { status: 400 });
      if (e instanceof BusinessError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
      console.error(e);
      return NextResponse.json({ error: 'internal' }, { status: 500 });
    }
  };
}
```

Uso:

```ts
// src/app/api/plans/route.ts
export const GET = apiHandler({
  auth: 'session',
  handler: async (req, { session }) => {
    const { items, total } = await trainingService.listPlans(req, session);
    return { items, total };
  },
});

export const POST = apiHandler({
  auth: 'coach',
  handler: async (req, { session }) => {
    const body = await parseJsonOrError(req, planSchema);
    if (!body.ok) throw body.error; // o devolver directo
    const plan = await trainingService.createPlan(body.data, session);
    return plan;
  },
});
```

## Shape de respuestas estándar

| Tipo de endpoint | Shape |
|---|---|
| Listado paginado | `{ items: T[], total?: number, nextCursor?: string }` |
| Detalle | objeto plano `T` |
| Mutación (POST/PATCH) | objeto plano `T` actualizado |
| Acción sin retorno | `{ ok: true }` |
| Error | `{ error: string, code?: string, issues?: ZodIssue[] }` |

**Eliminar wrappers ad-hoc**: `{ athletes: [...] }`, `{ plans: [...] }`, `{ results: [...] }`. Migrar progresivamente.

## Paginación estándar

```ts
// src/lib/api/pagination.ts (ya existe, extender)
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().optional(), // para cursor-based
});
```

Decisión: **cursor-based** para listas con scroll infinito (mensajes, logs); **page-based** para tablas (atletas, planes).

## Cliente frontend tipado

```ts
// src/lib/api-client/training.ts
import { apiFetch, apiPost, apiPatch, apiDelete } from './base';
import type { TrainingPlan } from '@/lib/domain';

export const trainingApi = {
  list: (params?: { athleteId?: string; status?: string }) =>
    apiFetch<{ items: TrainingPlan[]; total: number }>(`/api/plans?${new URLSearchParams(params)}`),

  get: (id: string) => apiFetch<TrainingPlan>(`/api/plans/${id}`),

  create: (data: PlanInput) => apiPost<TrainingPlan>('/api/plans', data),

  update: (id: string, data: Partial<PlanInput>) =>
    apiPatch<TrainingPlan>(`/api/plans/${id}`, data),

  archive: (id: string) => apiPost<{ok:true}>(`/api/plans/${id}/archive`, {}),

  saveAsTemplate: (id: string) => apiPost<PlanTemplate>(`/api/plans/${id}/save-as-template`, {}),
};
```

Frontend nunca hace `fetch('/api/...')` directo.

## Hooks de datos

Migrar a **TanStack Query** (React Query) para cache, refetch, optimistic updates, deduplicación:

```ts
// src/lib/hooks/use-training-plans.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useTrainingPlans(athleteId?: string) {
  return useQuery({
    queryKey: ['training-plans', athleteId],
    queryFn: () => trainingApi.list({ athleteId }),
    staleTime: 60_000,
  });
}

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: trainingApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training-plans'] }),
  });
}
```

**Beneficio**: elimina hooks ad-hoc en `store.ts`, evita race conditions, cache automática.

## Paquetes recomendados

| Paquete | Por qué |
|---|---|
| `@tanstack/react-query` | Cache, deduplicación, optimistic updates |
| `next-safe-action` (opcional) | Server actions tipadas con Zod |
| `superjson` | Serialización Date/Decimal en App Router |
| `pino` | Logger estructurado server-side |
| `@upstash/ratelimit` + Redis | Rate limit distribuido |
| `vitest` + `@testing-library/react` | Tests unitarios + componentes |
| `playwright` | E2E |
| `zod` | Ya en uso |
| `dayjs` o `date-fns` | Fechas (usar uno único) |
| `decimal.js` o `Prisma.Decimal` | Macros nutrición con precisión |

## Rate limiting

Endpoints prioritarios a proteger:
- `POST /api/auth/*`, `/api/register`, `/api/2fa/*` (5/min/IP)
- Search endpoints `/api/exercises`, `/api/food-catalog` (30/min/user)
- Mutaciones masivas (CSV import) (3/hora/user)

```ts
// src/lib/api/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const rateLimit = (key: string, max: number, window: string) =>
  new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(max, window) });
```

## Autenticación y autorización

- `requireSession()` — obliga login.
- `requireRole(role)` — checkea platform role.
- `requireTeamMembership(teamId, { adminOnly })` — checkea tenant.
- `assertAthleteAccess(athleteId, { write })` — checkea acceso a recurso.
- `assertCoachOwnsAthlete(athleteId)` — para acciones coach→atleta.

**Regla**: TODO endpoint write debe usar uno de estos. Tabla:

| Endpoint | Helper mínimo |
|---|---|
| `/api/athletes/[id]` (GET) | `assertAthleteAccess(id)` |
| `/api/athletes/[id]` (PATCH) | `assertAthleteAccess(id, {write:true})` |
| `/api/teams/[teamId]/billing-plans` (POST) | `requireTeamMembership(teamId, {adminOnly:true})` |
| `/api/plans` (POST) | `assertCoachOwnsAthlete(body.athleteId)` |

## Migración progresiva

1. Crear `apiHandler` y migrar 5 endpoints como prueba.
2. Crear `api-client/` con `base.ts` (ya hecho) + módulos por dominio.
3. Sustituir hooks ad-hoc por React Query.
4. Eliminar wrappers `{ athletes }` / `{ plans }` cuando todos los consumidores usen `api-client`.
5. Añadir tests al service layer.

## Estructura de logs y observabilidad

```ts
// src/lib/logger.ts
import pino from 'pino';
export const log = pino({ level: process.env.LOG_LEVEL ?? 'info' });
```

Log estructurado en cada `apiHandler`: `{ userId, route, method, duration, status }`. Enviar a un sink (Axiom, Logtail, Loki).
