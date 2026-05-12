# 📚 API Integration Guide — NEXUM Backend

## Overview

Este documento define los patrones, convenciones y mejores prácticas para trabajar con la API de NEXUM. Está diseñado para desarrolladores backend y frontend que necesiten integrar nuevos endpoints o extender funcionalidad existente.

**Tech Stack:**

- Next.js 16.2.4 App Router (API Routes)
- TypeScript 5.x (strict mode)
- Prisma 5.x ORM (PostgreSQL)
- Zod para validación de schemas

---

## 1. API Architecture Patterns

### 1.1 Route Structure

```
src/app/api/
├── [domain]/
│   ├── route.ts          # GET, POST
│   ├── [id]/
│   │   ├── route.ts      # GET, PATCH, DELETE
│   │   └── [action]/
│   │       └── route.ts  # Specialized actions
│   └── [nested]/
│       └── route.ts      # Nested resources
└── [auth-domain]/
    └── route.ts
```

**Ejemplo Real:**

- `POST /api/athletes` → Create athlete
- `GET /api/athletes?teamId=xxx` → List athletes (filtered by teamId for coaches)
- `PATCH /api/athletes/[id]` → Update athlete
- `DELETE /api/athletes/[id]` → Delete athlete
- `GET /api/plans/[id]/sessions/[sid]/exercises/[eid]` → Get specific exercise

### 1.2 HTTP Methods Convention

| Method   | Purpose             | Response                                                                     |
| -------- | ------------------- | ---------------------------------------------------------------------------- |
| `GET`    | Fetch resource(s)   | 200 OK, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found      |
| `POST`   | Create resource     | 201 Created, 400 Bad Request, 401/403 (auth), 422 Validation Error           |
| `PATCH`  | Update resource(s)  | 200 OK, 400 Bad Request, 401/403 (auth), 404 Not Found, 422 Validation Error |
| `DELETE` | Delete resource     | 204 No Content, 401/403 (auth), 404 Not Found                                |
| `PUT`    | Bulk upsert/replace | 200 OK, 400 Bad Request, 401/403 (auth), 422 Validation Error                |

---

## 2. Authentication & Authorization

### 2.1 Session-Based Auth (NextAuth.js)

Todos los endpoints requieren sesión activa:

```typescript
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Acceder a datos del usuario
  const userId = session.user.id
  const role = (session.user as { role?: string }).role // "COACH" | "ADMIN" | "ATHLETE"

  // ...
}
```

### 2.2 Role-Based Access Control (RBAC)

**Roles disponibles:**

- `COACH` — Gestiona atletas y planes
- `ATHLETE` — Acceso a su propio perfil y datos
- `ADMIN` — Acceso total

**Patrones de autorización:**

#### Pattern 1: Role Check

```typescript
const role = (session.user as { role?: string }).role
if (role !== 'COACH' && role !== 'ADMIN') {
  return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
}
```

#### Pattern 2: Coach-Athlete Relationship

```typescript
async function canAccessAthlete(
  userId: string,
  role: string | undefined,
  athleteId: string
): Promise<boolean> {
  if (role === 'ATHLETE') {
    const a = await prisma.athlete.findUnique({ where: { userId }, select: { id: true } })
    return a?.id === athleteId
  }

  if (role === 'COACH' || role === 'ADMIN') {
    const coach = await prisma.coach.findUnique({ where: { userId }, select: { id: true } })
    if (!coach) return false
    const a = await prisma.athlete.findUnique({
      where: { id: athleteId },
      select: { coachId: true },
    })
    return a?.coachId === coach.id
  }

  return false
}
```

#### Pattern 3: Team-Based Access

```typescript
// Para coaches: resolver equipo desde membresías activas
const memberships = await prisma.teamUserMembership.findMany({
  where: { userId: session.user.id, isActive: true },
  select: { teamId: true },
})

if (memberships.length === 0) {
  return NextResponse.json({ error: 'Coach no tiene equipos' }, { status: 400 })
}

const allowedTeamIds = memberships.map((m) => m.teamId)
const teamId = teamIdParam && allowedTeamIds.includes(teamIdParam) ? teamIdParam : allowedTeamIds[0]
```

### 2.3 Helper Functions

```typescript
// src/lib/api/auth-helpers.ts

export async function requireSession(): Promise<{ userId: string; role: string }> {
  const session = await auth()
  if (!session?.user?.id) throw new AuthError('No autenticado', 401)
  return { userId: session.user.id, role: (session.user as any).role }
}

export async function assertAthleteAccess(athleteId: string): Promise<void> {
  const session = await requireSession()
  const allowed =
    session.role === 'ADMIN' ||
    (session.role === 'ATHLETE' && (await isOwnAthlete(athleteId, session.userId))) ||
    (session.role === 'COACH' && (await coachOwnsAthlete(athleteId, session.userId)))

  if (!allowed) throw new ForbiddenError('Sin acceso al atleta')
}

export async function assertCoachAccess(athleteId: string, coachUserId: string): Promise<boolean> {
  // Verificar que el coach es propietario del atleta
}
```

---

## 3. Request/Response Format

### 3.1 Request Validation

Usar **Zod** para validación de schemas:

```typescript
import { z } from 'zod'

const planSchema = z.object({
  athleteId: z.string().min(1, 'athleteId requerido'),
  title: z.string().min(1).max(200),
  weekLabel: z.string().min(1).max(100).optional(),
  sessions: z.array(
    z.object({
      name: z.string(),
      block: z.string().optional(),
      exercises: z.array(
        z.object({
          exercise: z.string(),
          sets: z.number().int().positive(),
          reps: z.string(),
          // ...
        })
      ),
    })
  ),
})

export async function POST(request: Request) {
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = planSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const data = parsed.data
  // Procesar datos validados...
}
```

**Status Codes para validación:**

- `400 Bad Request` — Parámetros faltantes o tipo incorrecto
- `422 Unprocessable Entity` — Validación de schema falla (datos inválidos pero bien formados)

### 3.2 Success Response Format

```typescript
// GET (lista) — con paginación
{
  items: [
    { id: "xxx", name: "...", ... },
    { id: "yyy", name: "...", ... },
  ],
  nextCursor: "cursor-value" // null si no hay más
}

// GET (singular)
{
  id: "xxx",
  name: "...",
  // campos específicos del recurso
}

// POST (crear)
{
  id: "new-id",
  // datos del recurso creado
}
// Status: 201 Created

// PATCH (actualizar)
{
  id: "xxx",
  // campos actualizados
}
// Status: 200 OK

// DELETE
// Status: 204 No Content (sin body)
// O: { ok: true } con status 200
```

### 3.3 Error Response Format

```typescript
// Error genérico
{
  error: "Descripción del error"
  // Status: 400, 401, 403, 404, 500, etc.
}

// Error de validación
{
  error: "Datos inválidos",
  details: {
    athleteId: ["atletaId requerido"],
    sessions: ["Se requiere al menos una sesión"]
  }
  // Status: 422
}

// Error con contexto
{
  error: "Sin acceso",
  allowedTeams: ["team-1", "team-2"],
  // Status: 400, 403, etc.
}
```

---

## 4. Common API Patterns

### 4.1 Pagination Pattern

```typescript
import { paginationSchema, buildPaginationResponse } from '@/lib/api'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const pagination = paginationSchema.safeParse({
    take: searchParams.get('take') ?? 30,
    cursor: searchParams.get('cursor') ?? undefined,
    from: searchParams.get('from') ?? undefined, // ISO date
    to: searchParams.get('to') ?? undefined, // ISO date
  })

  const { take, cursor, from, to } = pagination.success
    ? pagination.data
    : { take: 30, cursor: undefined, from: undefined, to: undefined }

  const where: Record<string, unknown> = { athleteId }
  if (from || to) {
    where.date = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    }
  }

  const rows = await prisma.checkIn.findMany({
    where,
    orderBy: { date: 'desc' },
    take: take + 1, // +1 para detectar si hay más
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  })

  const { items, nextCursor } = buildPaginationResponse(rows, take)

  return NextResponse.json({ items, nextCursor })
}

// Cliente:
// GET /api/check-ins?athleteId=xxx&take=20&cursor=last-id&from=2025-01-01&to=2025-12-31
```

### 4.2 Filtering Pattern

```typescript
// Query parameters pattern
// GET /api/athletes?teamId=xxx&role=COACH&status=active

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const teamId = searchParams.get('teamId')
  const role = searchParams.get('role')
  const status = searchParams.get('status')

  const where: Prisma.AthleteWhereInput = {
    ...(teamId ? { teamId } : {}),
    ...(role ? { coach: { role } } : {}),
    ...(status === 'active' ? { deletedAt: null } : {}),
  }

  const athletes = await prisma.athlete.findMany({ where })
  return NextResponse.json(athletes)
}
```

### 4.3 Upsert Pattern

```typescript
// PUT /api/teams/catalog/goals — bulk upsert
export async function PUT(request: Request) {
  const body = (await request.json()) as Array<{
    code: string
    label: string
    description?: string
    isVisible?: boolean
    order?: number
  }>

  const results = await Promise.all(
    body.map((g) =>
      prisma.teamGoal.upsert({
        where: { teamId_code: { teamId, code: g.code } },
        update: {
          label: g.label,
          description: g.description ?? null,
          isVisible: g.isVisible ?? true,
          order: g.order ?? 0,
        },
        create: {
          teamId,
          code: g.code,
          label: g.label,
          description: g.description ?? null,
          isVisible: g.isVisible ?? true,
          order: g.order ?? 0,
        },
      })
    )
  )

  return NextResponse.json({ goals: results })
}
```

### 4.4 Multipart Form Data Pattern

```typescript
// POST /api/documents (multipart/form-data)
export async function POST(req: NextRequest) {
  const form = await req.formData()

  const file = form.get('file') as File | null
  const athleteId = form.get('athleteId') as string | null
  const title = (form.get('title') as string | null) ?? ''
  const category = (form.get('category') as string | null) ?? 'general'

  if (!file || !athleteId) {
    return NextResponse.json({ error: 'file y athleteId son requeridos' }, { status: 400 })
  }

  // Validar tipo y tamaño
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Máximo 10 MB' }, { status: 413 })
  }

  // Guardar archivo
  const buffer = Buffer.from(await file.arrayBuffer())
  const filename = `${Date.now()}-${athleteId.slice(-6)}.${ext}`
  await writeFile(path.join(dir, filename), buffer)

  // Crear registro en BD
  const doc = await prisma.document.create({
    data: {
      athleteId,
      title,
      category,
      fileUrl: `/uploads/docs/${filename}`,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    },
  })

  return NextResponse.json(doc, { status: 201 })
}
```

### 4.5 Soft Delete Pattern

```typescript
// No borrar físicamente; marcar como deletedAt
export async function DELETE(req, { params }) {
  const { id } = await params

  await prisma.plan.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}

// Al consultar, filtrar:
const plans = await prisma.plan.findMany({
  where: { athleteId, deletedAt: null },
})
```

### 4.6 Audit Logging Pattern

```typescript
import { logAudit } from '@/lib/audit'
import { auditMutation } from '@/lib/api'

// Simple audit
await logAudit(userId, 'DELETE', 'Plan', planId)

// Detailed audit (before/after)
await auditMutation({
  entity: 'Athlete',
  entityId: athlete.id,
  action: 'UPDATE',
  before: { fullName: oldAthlete.fullName, goal: oldAthlete.goal },
  after: { fullName: newAthlete.fullName, goal: newAthlete.goal },
  userId: session.user.id,
})
```

---

## 5. Notification Pattern

Integración con notifications para notificar cambios a usuarios:

```typescript
import { createNotification } from '@/lib/notifications'
import { NotificationType } from '@prisma/client'

// Al crear check-in
if (athlete.coach?.userId) {
  await createNotification({
    userId: athlete.coach.userId,
    type: NotificationType.CHECK_IN_RESPONDED,
    title: `${athlete.fullName} respondió al check-in`,
    body: `Peso: ${checkIn.weightKg} kg, Adherencia: ${checkIn.adherencePct}%`,
    link: `/coach/athletes/${athlete.id}`,
  })
}
```

---

## 6. Cron Jobs & Webhooks

### 6.1 Cron Job Authorization

```typescript
// POST /api/cron/check-in-reminders
export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  // ...
}

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${secret}`
}
```

### 6.2 Webhook Authorization

```typescript
// POST /api/webhooks/twilio
export async function POST(request: NextRequest) {
  const secretKey = process.env.WEBHOOK_SECRET ?? process.env.CRON_SECRET
  const secret = request.headers.get('x-webhook-secret')
  if (!secretKey || !secret || secret !== secretKey) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  // ...
}
```

---

## 7. Database Patterns

### 7.1 Transactions (Batch Operations)

```typescript
const plan = await prisma.$transaction(async (tx) => {
  return tx.plan.create({
    data: {
      athleteId: body.athleteId,
      coachId: coach.id,
      title: body.title,
      weekLabel: body.weekLabel,
      sessions: {
        create: body.sessions.map((s, si) => ({
          name: s.name,
          block: s.block ?? '',
          order: s.order ?? si,
          exercises: {
            create: s.exercises.map((e, ei) => ({
              exercise: e.exercise,
              sets: e.sets,
              reps: e.reps,
              order: e.order ?? ei,
            })),
          },
        })),
      },
    },
    include: { sessions: { include: { exercises: true } } },
  })
})
```

### 7.2 Efficient Queries (N+1 Avoidance)

```typescript
// ❌ MALO — N+1 queries
const athletes = await prisma.athlete.findMany()
for (const athlete of athletes) {
  const coach = await prisma.coach.findUnique({ where: { id: athlete.coachId } })
  // ...
}

// ✅ BUENO — Single query
const athletes = await prisma.athlete.findMany({
  include: { coach: true },
})

// ✅ TAMBIÉN BUENO — Batch query
const [recentCheckIns, recentSessions] = await Promise.all([
  prisma.checkIn.findMany({ where: { date: { gte: cutoff } }, distinct: ['athleteId'] }),
  prisma.sessionLog.findMany({ where: { date: { gte: cutoff } }, distinct: ['athleteId'] }),
])
```

### 7.3 Distinct Queries

```typescript
// Obtener IDs únicos de atletas que tuvieron check-in en últimos 7 días
const recentAthletes = await prisma.checkIn.findMany({
  where: { date: { gte: cutoff } },
  select: { athleteId: true },
  distinct: ['athleteId'],
})
```

---

## 8. Common Endpoints Reference

### Athlete Endpoints

- `GET /api/athletes` — Lista (con filtro por teamId)
- `POST /api/athletes` — Crear
- `GET /api/athletes/[id]` — Detalle
- `PATCH /api/athletes/[id]` — Actualizar
- `DELETE /api/athletes/[id]` — Eliminar
- `GET /api/athletes/[id]/overview` — Dashboard overview
- `GET /api/athletes/[id]/training-stats` — Estadísticas entrenamiento
- `GET /api/athletes/[id]/health-connections` — Conexiones de salud
- `POST /api/athletes/[id]/subscriptions` — Asignar plan

### Plan (Training) Endpoints

- `GET /api/plans?athleteId=xxx` — Listar planes
- `POST /api/plans` — Crear plan
- `GET /api/plans/[id]` — Detalle plan
- `PATCH /api/plans/[id]` — Actualizar plan
- `DELETE /api/plans/[id]` — Eliminar plan
- `POST /api/plans/[id]/sessions/[sid]` — Añadir sesión

### Check-in & Daily Log Endpoints

- `GET /api/check-ins?athleteId=xxx` — Listar check-ins
- `POST /api/check-ins` — Crear check-in
- `PATCH /api/check-ins/[id]` — Coach responde check-in
- `GET /api/daily-logs?athleteId=xxx` — Listar daily logs
- `POST /api/daily-logs` — Crear daily log

### Team Endpoints

- `GET /api/teams` — Listar equipos del usuario
- `POST /api/teams` — Crear equipo
- `PATCH /api/teams/[id]` — Editar equipo
- `DELETE /api/teams/[id]` — Eliminar equipo
- `GET /api/teams/catalog` — Obtener goals y phases
- `PUT /api/teams/catalog/goals` — Actualizar goals
- `GET /api/teams/contract` — Obtener template del contrato

### Message & Notification Endpoints

- `GET /api/messages?withUserId=xxx` — Listar mensajes
- `POST /api/messages` — Enviar mensaje
- `GET /api/notifications` — Listar notificaciones
- `PATCH /api/notifications/[id]` — Marcar como leído

### Service Plan & Nutrition Endpoints

- `GET /api/service-plans` — Listar planes de servicio
- `POST /api/service-plans` — Crear plan
- `GET /api/nutrition-plans?athleteId=xxx` — Listar planes nutricionales
- `POST /api/nutrition-logs` — Log de comida

---

## 9. Debugging & Troubleshooting

### Common Errors

| Error                     | Causa                   | Solución                                    |
| ------------------------- | ----------------------- | ------------------------------------------- |
| 401 Unauthorized          | No hay sesión           | Verificar que usuario está autenticado      |
| 403 Forbidden             | Sin permisos            | Verificar RBAC y relaciones (coach-athlete) |
| 404 Not Found             | Recurso no existe       | Verificar ID y que no está soft-deleted     |
| 422 Validation Error      | Schema validation falla | Verificar tipos y formatos de datos         |
| 500 Internal Server Error | Error en servidor       | Ver logs de consola                         |

### Logging Best Practices

```typescript
// Logging de errores
console.error('[api/plans]', err)

// Logging de operaciones críticas
console.log(`[api/athletes] ✅ Created athlete: ${athlete.id} for coach ${coachId}`)
console.log(`[cron/check-in-reminders] Notified ${notified} athletes`)
```

---

## 10. Performance Tips

1. **Use `include` for related data**, not separate queries
2. **Limit query results** with `take` parameter
3. **Use indexes** on frequently filtered fields (teamId, athleteId, userId)
4. **Defer notifications** to background jobs (already implemented via `@prisma/client`)
5. **Cache static data** like team catalog (goals, phases)
6. **Compress large responses** with gzip (automatic in Next.js)

---

## 11. Migration Guide for New Endpoints

When adding a new endpoint:

1. **Define schema** using Zod
2. **Add RBAC check** at the top of handler
3. **Validate input** with `safeParse()`
4. **Execute DB operation** (with transaction if needed)
5. **Log audit trail** if mutation
6. **Send notification** if relevant
7. **Return consistent response** format

**Template:**

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const bodySchema = z.object({
  // ... define fields
})

export async function POST(request: Request) {
  // 1. Auth
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // 2. RBAC
  const role = (session.user as { role?: string }).role
  if (role !== 'COACH' && role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  // 3. Validate input
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  // 4. Execute
  try {
    const result = await prisma.resource.create({ data: parsed.data })

    // 5. Audit (if mutation)
    // await logAudit(session.user.id, "CREATE", "Resource", result.id);

    // 6. Notify (if needed)
    // await createNotification({ ... });

    // 7. Return
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    console.error('[api/resource]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
```

---

**Last Updated:** 9 de mayo 2026
**Version:** 1.0
