# PLAN BACKEND & FLUJOS 2026 — Seguridad, Consistencia y Escalabilidad

> Objetivo: dejar el back **seguro, consistente y escalable**, con flujos coach/atleta claros y sin fugas de datos.
> Alcance: API routes, Prisma, auth, cron, validación, auditoría, paginación, transacciones.
> Fuera de alcance: rediseño UI (ver `PLAN-UX-LAYOUT-2026.md`), cambios de modelo de negocio.

---

## 0. Estado actual (resumen auditoría)

- Auth con NextAuth (JWT, Credentials) + roles `COACH | ATHLETE | ADMIN`. OK base.
- **Sin middleware global** de protección → cada endpoint se protege a mano (inconsistente).
- Varios endpoints **GET sin validación de ownership** → fuga de datos entre atletas y entre coaches.
- POST `/api/plans` no valida que el coach sea dueño del atleta destino.
- PATCH `/api/check-ins/[id]` no valida ownership del coach.
- `prisma.$transaction` **no se usa** en operaciones multi-tabla (planes, nutrición, etc.).
- Audit log existe pero **se llama poco** (solo en algunas mutaciones).
- Paginación con `take` hardcoded sin `skip`/cursor.
- Faltan índices en FKs frecuentes (`coachId`, `athleteId`, mensajes).
- Sin soft delete: borrar plan elimina historial.
- Sin rate limiting ni `revalidatePath` tras mutaciones.
- Cron `inactive-athletes` con loop N+1.
- Validación de input con Zod **parcial**: algunos endpoints leen `req.json()` sin schema.

---

## 1. Principios

1. **Seguridad por defecto**: ningún endpoint accesible sin auth + ownership check explícito.
2. **Una sola fuente de verdad** para autorización: helper central `assertAccess(...)`.
3. **Validación de input siempre con Zod** en mutaciones y query params críticos.
4. **Mutaciones atómicas** vía `prisma.$transaction` cuando tocan más de una tabla.
5. **Auditoría obligatoria** en cualquier mutación que afecte datos del atleta.
6. **Paginación estándar**: `take`, `skip` o `cursor`, `take` máximo 100.
7. **Compatibilidad backward**: añadir, no romper. Versionar si hay cambios de contrato.
8. **Cron idempotente**: poder reejecutar sin duplicar efectos.

---

## 2. Helpers y primitivas centrales

Crear en `src/lib/auth/`:

### 2.1 `requireSession()`
- Devuelve `{ userId, role }` o lanza `401`.

### 2.2 `requireRole(role | role[])`
- Envoltorio de `requireSession` que valida rol.

### 2.3 `assertAthleteAccess(athleteId, { write?: boolean })`
- Centraliza la regla:
  - `ATHLETE` → solo si `athlete.userId === session.userId`.
  - `COACH` → solo si `athlete.coachId === coach.id` del session.
  - `ADMIN` → siempre.
- `write=true` exige rol ≥ COACH para escrituras de plan/nutri/contexto del coach.
- Lanza `403` con mensaje genérico (sin filtrar info).

### 2.4 `assertCoachOwnsAthlete(athleteId)`
- Específico para coaches: niega si no es su atleta.

### 2.5 `withApiHandler(handler)`
- Wrapper que captura excepciones (`AuthError`, `ForbiddenError`, `ZodError`) y devuelve respuesta JSON consistente:
  - `{ error: { code, message } }` y status correcto.

### 2.6 `paginationSchema` (zod)
- `take: number().int().min(1).max(100).default(20)`
- `cursor: string().optional()`

### 2.7 `auditMutation({ entity, entityId, action, before, after })`
- Wrapper sobre `logAudit` que calcula diff y guarda actor.

Ubicación: `src/lib/auth/`, `src/lib/api/`.

---

## 3. Middleware global

Crear `middleware.ts` en raíz:

- Matcher: `/api/:path*` excepto `auth/*`, `register`, `cron/*`, `wger/*`.
- Verifica JWT (no DB) y rechaza con 401 si no hay sesión.
- Inyecta header `x-user-id` y `x-user-role` para downstream (opcional; aún así los endpoints siguen revisando con `requireSession` para defensa en profundidad).

Ojo: **no sustituye** los checks por endpoint, los complementa.

---

## 4. Cambios de Schema Prisma

Nueva migración `2026_05_security_perf`:

### 4.1 Índices nuevos
- `Athlete @@index([coachId])`
- `Coach @@index([userId])`
- `CheckIn @@index([athleteId, date])`
- `NutritionPlan @@index([athleteId, isActive])`
- `Document @@index([athleteId])`
- `Message @@index([fromUserId, toUserId, createdAt])`

### 4.2 Soft delete
- Añadir `deletedAt DateTime?` a:
  - `Plan`
  - `NutritionPlan`
  - `Document`
  - `Message` (opt para moderación)
- Filtrar `where: { deletedAt: null }` por defecto en repositorios.

### 4.3 Limpieza
- Quitar campos sin uso (`TrainingTemplate.splitType` si confirmamos que no se usa).
- Confirmar/normalizar nullables dudosos (`AthleteMacroTarget.coachId`, `Athlete.servicePlanId`).

### 4.4 Reglas
- Migración compatible (no destructiva). Backfill `deletedAt = null`.
- Plan de rollback documentado.

---

## 5. Hardening de endpoints (por carpeta)

Para cada uno: **auth + ownership + zod + transaction + audit + paginación**.

### 5.1 `athletes/`
- `GET /api/athletes`:
  - Si `COACH`: forzar `coachId = session.coachId` (ignorar query).
  - Si `ATHLETE`: 403.
  - Paginación.
- `GET /api/athletes/[id]`: ya OK con `canReadAthlete`. Confirmar.
- `POST /api/athletes`: solo COACH; setear `coachId` desde sesión (no del body).
- `PATCH /api/athletes/[id]`: `assertAthleteAccess(write)`. Audit.
- `DELETE`: solo COACH dueño. Audit + soft delete.
- `compare`: validar que todos los `athleteIds` pertenezcan al coach.

### 5.2 `plans/`
- `GET /api/plans?athleteId=...`: `assertAthleteAccess(athleteId)`.
- `POST /api/plans`: `assertCoachOwnsAthlete(body.athleteId)`. Wrap en `prisma.$transaction` (plan + sessions + exercises). Zod. Audit.
- `PATCH/DELETE /api/plans/[id]`: cargar plan → `assertCoachOwnsAthlete(plan.athleteId)`.
- Subrutas `sessions/[sid]`, `exercises/[eid]`: misma regla de ownership.
- `templates`: solo COACH propio.

### 5.3 `nutrition-plans/`, `nutrition-targets/`, `nutrition-templates/`
- Igual patrón: ownership + zod + transaction al crear plan con comidas + audit.

### 5.4 `nutrition-logs/`, `daily-logs/`, `session-logs/`
- `GET ?athleteId=`: `assertAthleteAccess`.
- `POST`: setear `athleteId` desde:
  - Si `ATHLETE`: forzar `athleteId = session.athleteId`.
  - Si `COACH`: validar que sea su atleta.
- Zod estricto en payload.
- Paginación + filtros por fecha (`from`, `to`).

### 5.5 `check-ins/`
- `GET ?athleteId=`: `assertAthleteAccess`.
- `POST`: como logs (atleta dueño de su check-in).
- `PATCH /api/check-ins/[id]`: validar coach dueño del atleta del check-in.
- Audit en PATCH.

### 5.6 `messages/`
- `GET ?withUserId=`: validar que ambos pertenezcan a la misma relación coach↔atleta (no permitir mensajes a usuarios random).
- `POST`: misma regla.
- Paginación cursor por `createdAt`.
- Mark as read en endpoint separado para evitar side effects en GET.

### 5.7 `notifications/`
- `GET`: del propio user.
- `POST`: solo COACH/ADMIN, validar destinatario.
- `mark-read`: idempotente.

### 5.8 `documents/`
- `GET ?athleteId=`: `assertAthleteAccess`.
- `POST`: validar ownership; si `ATHLETE`, solo puede subir si la categoría lo permite (definir whitelist).
- `DELETE`: validar autor o coach dueño.

### 5.9 `progress-photos/`
- Ya tiene `canAccessAthlete`. Confirmar y reusar helper central.

### 5.10 `exercise-notes/`
- Hoy **sin auth**. Añadir `requireSession` + `assertAthleteAccess`.

### 5.11 `food-catalog/`, `wger/*`, `emojis/`
- Solo `requireSession` (datos públicos pero no anónimos).
- `GET food-catalog`: paginación + `q` search con índice fulltext (futuro).

### 5.12 `coach/`
- `inbox`, `today`: `requireRole("COACH")` + filtrar por `coach.id` del session.

### 5.13 `me/`
- Devolver siempre datos del session, nunca aceptar `userId` en query.

### 5.14 `onboarding/coach`, `onboarding/athlete`
- `coach`: solo si rol del token es COACH; rechazar si ATHLETE intenta convertirse.
- `athlete`: solo si rol ATHLETE; validar `coachEmail` existe y es COACH.

### 5.15 `register/`
- Validar email único, password fuerte (Zod).
- Setear rol por flag explícita (no aceptar `role` arbitrario del body).
- Rate limit estricto.

### 5.16 `cron/*`
- Confirmar Bearer token desde env (`CRON_SECRET`).
- Refactor `inactive-athletes` para evitar N+1: una query agregada con `groupBy` o una join.
- Marca `lastRunAt` para idempotencia.

---

## 6. Transacciones obligatorias

Lista de mutaciones a envolver en `prisma.$transaction`:

- POST `/api/plans` (plan + sessions + exercises).
- PATCH `/api/plans/[id]` cuando reescribe sessions/exercises.
- POST `/api/nutrition-plans` (plan + meals + foods).
- POST `/api/check-ins` (checkin + notification al coach).
- POST `/api/session-logs` (sessionLog + setLogs + opt notification).
- DELETE `/api/athletes/[id]` (cascade controlado + audit).

---

## 7. Auditoría

Cubrir con `auditMutation` todas las acciones que modifican datos del atleta:

- create/update/delete `Plan`, `NutritionPlan`, `CheckIn` (incluido `coachNote`), `AthleteContextProfile`, `Document`, `Athlete`, `ServicePlan` asignado.
- Guardar `before/after` (diff JSON) y actor.
- Endpoint admin para consultar log por atleta (futuro).

---

## 8. Paginación y filtros estándar

Patrón único:

```
?take=20&cursor=<id>&from=<iso>&to=<iso>&q=<text>
```

- `take` máx 100.
- `cursor` por `id` o `createdAt` según entidad.
- Respuesta:
  ```json
  { "items": [...], "nextCursor": "..." }
  ```

Aplicar en: `messages`, `session-logs`, `nutrition-logs`, `daily-logs`, `check-ins`, `documents`, `notifications`, `food-catalog`, `team-posts`.

---

## 9. Rate limiting

- Implementar limiter ligero en memoria (LRU) o Redis si está disponible.
- Reglas iniciales:
  - `register`: 5/min/IP.
  - `messages POST`: 30/min/user.
  - `session-logs POST`: 60/min/user.
  - `cron/*`: público pero gated por Bearer.

---

## 10. Cache & revalidación

- Tras mutaciones críticas, llamar `revalidatePath` o `revalidateTag` en server actions/route handlers:
  - `revalidateTag(`athlete:${id}`)` tras cambios.
- Server components que leen overview pueden usar `unstable_cache` con tag.

---

## 11. Flujos coach/atleta — definición canónica

### 11.1 Coach
1. Registro → onboarding coach → puede crear atletas o aceptar solicitudes.
2. Crea plan de entrenamiento y nutrición para sus atletas.
3. Recibe notificaciones: nuevo check-in, atleta inactivo, mensajes.
4. Revisa estadísticas y responde check-ins.
5. Comparte documentos.

### 11.2 Atleta
1. Registro → onboarding atleta → introduce email coach.
2. Ve plan, nutrición, contexto (read según rol), maquinaria (CRUD propio).
3. Registra entrenamiento (`session-logs`), nutrición (`nutrition-logs`), diario (`daily-logs`), fotos.
4. Envía check-in semanal.
5. Mensajea con su coach.

### 11.3 Reglas de ownership consolidadas
- `Athlete.coachId` es la fuente de verdad.
- `ATHLETE` solo accede a sus propios datos vía `Athlete.userId`.
- `COACH` accede a `Athlete` cuyo `coachId === coach.id`.
- `ADMIN` acceso total (con audit).
- Atleta sin coach asignado: solo flujos personales (no chat, no check-ins enviados).

### 11.4 Eventos de dominio (futuro)
- `CheckInCreated`, `SessionLogCreated`, `PlanUpdated`, `MessageSent`.
- Despachan: notificaciones, recompute KPIs cacheados.

---

## 12. Plan de migración por fases

| Fase | Alcance | Esfuerzo aprox. | Riesgo |
|---|---|---|---|
| 0 | Helpers `requireSession`, `assertAthleteAccess`, `withApiHandler`, `auditMutation` | bajo | Bajo |
| 1 | Parchar P0 (endpoints sin auth/ownership) y middleware global | bajo | Bajo |
| 2 | Migrar plans, nutrition-plans, check-ins a transactions + zod + audit | medio | Medio |
| 3 | Migrar logs (session/nutrition/daily) y messages con paginación cursor | medio | Medio |
| 4 | Migración Prisma: índices + `deletedAt` | bajo | Bajo (compat) |
| 5 | Auditoría completa + revalidatePath + tags | bajo | Bajo |
| 6 | Rate limiting + refactor cron sin N+1 | medio | Bajo |
| 7 | Limpieza: campos sin uso, naming, endpoints muertos | bajo | Bajo |

Cada fase termina con `npx tsc --noEmit` + `npm run build` + tests manuales clave (login coach, login atleta, crear plan, check-in).

---

## 13. Criterios de aceptación

- Ningún endpoint accesible sin sesión válida (excepto `register`, `auth`, `cron` con bearer).
- Ningún `GET ?athleteId=` devuelve datos de un atleta ajeno.
- Cualquier mutación multi-tabla está en `prisma.$transaction`.
- 100% de mutaciones críticas registran audit.
- Listados expuestos al cliente tienen paginación.
- Cron `inactive-athletes` baja a O(1) queries agregadas.
- `npm run build` sin warnings nuevos.
- Penetración manual: probar 5 escenarios de explotación documentados (atleta intenta ver otro atleta, coach intenta ver atleta ajeno, etc.) → todos rechazados con 403.

---

## 14. Riesgos y mitigaciones

- **Romper clientes existentes** al endurecer endpoints → mitigación: añadir validación primero detrás de feature flag, log warnings antes de rechazar.
- **Migración Prisma con datos productivos** → mitigación: campos opcionales, sin defaults destructivos, backup previo.
- **Cambios de paginación rompen UI** → mitigación: mantener formato actual + añadir nextCursor; UI migra después.

---

## 15. Preguntas a confirmar antes de implementar

1. ¿Confirmas que solo `COACH`, `ATHLETE`, `ADMIN` son roles vigentes? (no hay viewer/staff). Sí — COACH, ATHLETE únicamente. ADMIN soy solo yo con mi user actual para iniciar sesion para verlo todo que tengo todo lo mismo que coach y coach no tiene restricciones tampoco.
2. ¿Implementamos rate limiting in-memory o esperamos a tener Redis? REDIS, implementalo
3. ¿Soft delete aplica también a `Athlete` y `User`, o solo a entidades de contenido? SI, para desactuivarlo pero mantener el historial. Para `User` sería un `isActive` booleano para evitar problemas de integridad referencial.
4. ¿Atleta sin coach asignado puede registrar entrenamientos/nutrición igualmente? (modo solo personal). No, atleta siempre pretenece a coach.
5. ¿Documentos: qué categorías puede subir el atleta y cuáles son solo coach? El coach peude crear categoruas y el atleta sube en esa categoria creada preo atleta. Si no por fecto es defaul y ya la categoria, soloe  spara filktrars y visualmente cerlas mejor por filtro y demas
6. ¿Mensajería: solo coach↔atleta de su relación, o también atleta↔atleta dentro del mismo coach (team)? solo coach-atleta, no atleta-atleta para evitar complicaciones de ownership y privacidad entre atletas del mismo coach. auqnbue ya esta l muro para la comunicacion netre atletas del mismo coach.
7. ¿Logs históricos (session-logs, check-ins) son inmutables tras X días o siempre editables? Editable por X días (ej. 7) luego inmutable
8. ¿Mantenemos `cron` con Bearer en header o migramos a Vercel cron + `request.ip` validado? Mantener Bearer + opcional Vercel cron IP check
9. ¿Audit log lo expones en UI (admin) o queda solo backend? Exponer en UI para Coach con paginación y filtros
10. ¿Versionamos API (`/api/v1/...`) ahora o no es necesario aún? No ahora; preparar plan para /api/v1 cuando haya breaking changes

---

## 16. Fuera de alcance

- Migración a tRPC u otra capa.
- Multitenancy.
- Push notifications nativas.
- WebSockets para chat tiempo real (queda para futura iteración con Pusher/SSE).
- Cambios de UI (cubiertos por `PLAN-UX-LAYOUT-2026.md`).
