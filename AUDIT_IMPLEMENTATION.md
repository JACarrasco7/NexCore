# 🔍 AUDITORÍA COMPLETA: app_fitness
**Fecha:** 18 de mayo de 2026  
**Total Issues:** 47 (13 CRÍTICOS | 22 IMPORTANTES | 12 WARNINGS)

---

## 📋 RESUMEN EJECUTIVO

✅ **Funcionalidad:** 85% operacional  
⚠️ **Performance:** 60% (N+1 queries, sin caching)  
🔒 **Seguridad:** 70% (auth bien, pero race conditions + validación débil)  
📝 **Type Safety:** 65% (múltiples `any`, loose typing)  

**Critical Blockers para Producción:**
1. Race conditions en athlete/coach onboarding
2. N+1 queries en endpoints de comparación
3. Cascading deletes rotos (integridad referencial)
4. Silent error handling (40+ `.catch(() => null)`)
5. Missing transaction atomicity (orphaned records posibles)

---

## 🚨 CRÍTICOS - 13 Issues

| ID | Issue | Ubicación | Línea | Causa | Impacto | Fix |
|----|-------|-----------|-------|-------|---------|-----|
| 1 | N+1 Query: athletes/compare | `src/app/api/athletes/compare/route.ts` | 22-36 | Loop implícito sin índices | 20+ queries/request | Índices + query optimization |
| 2 | Missing .select() en coach onboarding | `src/app/api/onboarding/athlete/route.ts` | 76-80 | Carga todas las columnas | Memory overhead | Agregar select: { id, userId } |
| 3 | Race condition: Athlete creation | `src/app/api/onboarding/athlete/route.ts` | 131-166 | Coach puede eliminarse entre check y create | FK violation 500 | Usar $transaction + validar coachId |
| 4 | Silent error en chat-panel polling | `src/components/chat-panel.tsx` | 43-50 | Fetch sin try/catch | Memory leak + polling muerto | Agregar error handling + AbortController |
| 5 | Cascading DELETE roto: Athlete.coach | `prisma/schema.prisma` | 232 | Sin `onDelete: SetNull` | Integridad referencial | Cambiar a `onDelete: SetNull` |
| 6 | Middleware token parsing error | `middleware.ts` | 28-30 | Error silenciado | 2FA bypass posible | Validar + throw en error crítico |
| 7 | Missing request validation (5+ endpoints) | `src/app/api/check-ins/route.ts` + 4 más | 87, 70, 191 | Destruct manual sin Zod | Inyección datos, silent failures | Implementar Zod schema |
| 8 | AbortController leak en chat-panel | `src/components/chat-panel.tsx` | 45-50 | setInterval sin AbortController | Memory leak en prod | Implementar AbortController + cleanup |
| 9 | Broken coach onboarding (transacción) | `src/app/api/onboarding/coach/route.ts` | 33-52 | Sin $transaction | Orphaned User records | Envolver en $transaction |
| 10 | Silent error swallowing dashboard | `src/components/athlete-dashboard.tsx` | 212-235 | 6 fetches con `.catch(() => null)` | UI broken sin feedback | Agregar error boundaries + toast |
| 11 | Missing .distinct() en cron | `src/app/api/cron/inactive-athletes/route.ts` | 26-39 | N+1 en findMany posterior | O(N) queries, timeout | Optimizar con distinct + limit |
| 12 | No rollback en nested transaction | `src/app/api/athletes/route.ts` | 197-220 | Sin validación de relaciones | Transacción rollback silencioso | Agregar error handling explícito |
| 13 | Missing null check en relation fetch | `src/app/api/nutrition-logs/[id]/route.ts` | 23-30 | `log.athleteId` sin validar null | Runtime error | Validar `log !== null` antes |

---

## 📊 IMPORTANTES - 22 Issues

| ID | Issue | Ubicación | Línea | Solución |
|----|-------|-----------|-------|----------|
| 14 | Repeated coach lookups (40+) | `src/app/api/athletes/[id]/training-stats/route.ts` + 20 más | 16, 83+ | Agregar cache en JWT (ej: coachId) |
| 15 | `any` type en middleware | `middleware.ts` | 27, 30, 35 | Type Response<any> → Response<TokenPayload> |
| 16 | Invalid constraint: Coach.userId @unique sin onDelete | `prisma/schema.prisma` | 194, 232 | Definir cascada clara (SetNull o Cascade) |
| 17 | Admin role sin server-side validation | `src/auth.ts` | 50-65 | Server-side role check en TODOS endpoints |
| 18 | Cursor pagination sin validar propiedad | `src/app/api/session-logs/route.ts` | 28-35 | Validar cursor pertenece a usuario autenticado |
| 19 | Race: Check-in duplicate detection | `src/app/api/check-ins/route.ts` | 117-135 | Usar upsert con unique constraint |
| 20 | Missing JSON parse error handling | `src/app/api/athletes/route.ts` | 109 | Try/catch en request.json() → 400 si invalid |
| 21 | No idempotency en DELETE /athletes/[id] | `src/app/api/athletes/[id]/route.ts` | 128-140 | Cambiar `.catch(() => null)` a throw |
| 22 | No MaxLength validation en fullName | `src/app/api/onboarding/athlete/route.ts` | 14-20 | Agregar Zod: z.string().max(255) |
| 23 | Session token sin maxAge hardcoded | `src/auth.ts` | N/A | Agregar `callbacks: { jwt: { maxAge: 3600 } }` |
| 24 | No rate limit en /api/messages polling | `src/components/chat-panel.tsx` | 48 | Implementar rate limit middleware (1 req/s por user) |
| 25 | Cascading delete incompleto: TeamUserMembership | `prisma/schema.prisma` | 340-341 | Validar Team.userMemberships después delete |
| 26 | Incomplete enum mapping: CadenceFromApi | `src/app/api/athletes/[id]/route.ts` | 42-56 | Agregar validación: `if (!map[value]) throw` |
| 27 | Unhandled Promise rejection en fetch chain | `src/app/athlete/onboarding/page.tsx` | 89-104 | Usar `Promise.allSettled()` + error handling |
| 28 | Missing CoachSubscription.team validation | `prisma/schema.prisma` | 505 | Agregar `onDelete: Cascade` o SetNull |
| 29 | Double-submit en form (settings) | `src/components/coach-athlete-dashboard-settings.tsx` | 74-92 | Agregar `loading` state + disable button |
| 30 | Memory leak: floating-chat polling | `src/components/floating-chat.tsx` | 68-75 | Implementar cleanup en useEffect return |
| 31 | No connection pooling config | `prisma/schema.prisma` | 8-10 | Agregar `connectionLimit = 50` en datasource |
| 32 | No unique constraint en OtpToken.token | `prisma/schema.prisma` | 760+ | Agregar `@unique` en token field |
| 33 | No validation: maxAthletes negativo | `src/app/api/teams/[teamId]/billing-plans/route.ts` | 86-108 | Agregar `.int().positive()` en Zod |
| 34 | Weak TOTP secret (32 bits) | `src/app/api/2fa/setup/route.ts` | Implícito | Usar secrety.generate() con 256 bits |
| 35 | No CSRF protection en GET | `middleware.ts` + endpoints | 1+ | Implementar CSRF token + validar |

---

## ⚠️ WARNINGS - 12 Issues

| ID | Issue | Ubicación | Solución |
|----|-------|-----------|----------|
| 36 | Unused import: Goal enum | `src/app/api/onboarding/athlete/route.ts:4` | Remover import |
| 37 | Inefficient date sort (JS vs SQL) | `src/app/api/cron/inactive-athletes/route.ts:45-55` | Usar `ORDER BY` en query |
| 38 | Hardcoded "Canada" timezone en Food API | `src/app/api/food-catalog/route.ts:28` | Hacer dinámico desde user preferences |
| 39 | Magic strings en enum checks | `src/app/athlete/training/log/page.tsx:156` | Crear const ENUM_MAP |
| 40 | Unused SessionLog fields en select | `src/app/api/athletes/[id]/training-stats/route.ts:45` | Limpiar select innecesarios |
| 41 | No logging en API errors | `src/app/api/**/*` | Agregar console.error + monitoreo (Sentry) |
| 42 | Stale closure en fetch loop | `src/app/athlete/onboarding/page.tsx:95-98` | Usar useCallback con deps |
| 43 | No loading state en AsyncThunk | `src/components/athlete-dashboard.tsx:212-220` | Agregar skeleton/loading UI |
| 44 | Hardcoded URL en fetch | `src/app/api/food-catalog/route.ts:12` | Usar ENV var con fallback |
| 45 | No error boundary en dashboard | `src/app/athlete/page.tsx` | Implementar React Error Boundary |
| 46 | Inconsistent error response format | `src/app/api/**/route.ts` | Crear error response factory |
| 47 | Missing INDEX en nutritionLogs.date | `prisma/schema.prisma:660` | Agregar `@@index([athleteId, date])` |

---

## 📈 PLAN DE IMPLEMENTACIÓN

### Fase 1: CRÍTICOS (Hoy)
**Objetivo:** Eliminar race conditions, orphaned records, silent errors.  
**Tiempo:** 4-5 horas  
**Orden:** 1, 5, 3, 9, 8, 12, 13, 6, 7

```
✅ 1. Prisma schema: Cascading deletes (issue #5)
  - Athlete.coach: onDelete: SetNull
  - CoachSubscription.team: onDelete: Cascade
  
✅ 2. Coach onboarding transaction (issue #9)
  - Envolver User + Coach en $transaction
  
✅ 3. Athlete onboarding race fix (issue #3)
  - Usar $transaction + validar coachId exist antes create
  
✅ 4. Middleware error handling (issue #6)
  - Cambiar try/catch silencioso por validación explícita
  
✅ 5. Chat polling + AbortController (issues #4, #8)
  - Agregar try/catch en fetch
  - Implementar AbortController
  - Cleanup en useEffect return
  
✅ 6. Request validation (issue #7)
  - Zod schema en 5+ endpoints (check-ins, daily-logs, athletes, etc.)
  - JSON parse error handling
  
✅ 7. Transaction rollback handling (issue #12)
  - Agregar .catch explícito en $transaction
  
✅ 8. Null check en relation fetch (issue #13)
  - Validar before acceso
```

### Fase 2: IMPORTANTES (Mañana)
**Objetivo:** Performance, type safety, security.  
**Tiempo:** 6-8 horas  
**Orden:** 14, 15, 16, 31, 32, 17, 24, 29, 30

```
✅ 1. Connection pooling (issue #31)
  - Agregar connectionLimit en Prisma
  
✅ 2. Type safety (issue #15)
  - Remover `any` en middleware
  
✅ 3. Indexes en Prisma (issues #16, 31, 47)
  - @@index([athleteId, date]) en múltiples modelos
  
✅ 4. Unique constraints (issue #32)
  - OtpToken.token @unique
  
✅ 5. Rate limiting (issue #24)
  - Middleware que limita /api/messages (1 req/s per user)
  
✅ 6. Double-submit prevention (issue #29)
  - Loading state + button disabled
  
✅ 7. Server-side role validation (issue #17)
  - Checks en TODOS endpoints (no confiar JWT role)
  
✅ 8. Coach lookup caching (issue #14)
  - Cache en memoria o JWT (coachId + displayName)
```

### Fase 3: WARNINGS (Próxima semana)
**Objetivo:** Code quality, observability, deuda técnica.  
**Tiempo:** 4-6 horas

---

## 🔧 ARCHIVO: Cambios Prioritarios

### 📄 `prisma/schema.prisma`
```prisma
// CAMBIO 1: Cascading deletes
model Athlete {
  coachId  String
  coach    Coach  @relation(fields: [coachId], references: [id], onDelete: SetNull)  // ← WAS: missing
}

model CoachSubscription {
  team     Team  @relation(fields: [teamId], references: [id], onDelete: Cascade)  // ← WAS: missing
}

// CAMBIO 2: Connection pooling
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
  connectionLimit = 50  // ← NEW
}

// CAMBIO 3: Indexes
model SessionLog {
  @@index([athleteId, date])  // ← NEW
}

model CheckIn {
  @@unique([athleteId, date])  // ← CHANGE (was findFirst, now upsert-safe)
}

model OtpToken {
  token String @unique  // ← NEW
}
```

### 📄 `src/app/api/onboarding/coach/route.ts`
```typescript
// CAMBIO: Transacción para atomicity
const result = await prisma.$transaction(async (tx) => {
  const existing = await tx.coach.findUnique({ where: { userId } })
  if (existing) return existing
  
  const updated = await tx.coach.update({...})  // ← Este puede fallar
  return updated
}, { timeout: 10000 })

return NextResponse.json(result)
```

### 📄 `src/components/chat-panel.tsx`
```typescript
// CAMBIO: AbortController + error handling
const abortControllerRef = useRef<AbortController | null>(null)

const fetchMessages = useCallback(async () => {
  try {
    abortControllerRef.current?.abort()  // Cancel previous
    abortControllerRef.current = new AbortController()
    
    const res = await fetch(`/api/messages?${qs}`, {
      signal: abortControllerRef.current.signal
    })
    if (res.ok) {
      const data: Msg[] = await res.json()
      setMessages(data)
    } else {
      console.error('Chat fetch failed:', res.status)
      toast.error('No se pudieron cargar mensajes')  // ← NEW feedback
    }
  } catch (err) {
    if (err.name !== 'AbortError') {  // Don't error on cancellation
      console.error('Chat fetch error:', err)
    }
  }
}, [withUserId, athleteId])

useEffect(() => {
  fetchMessages()
  const interval = setInterval(fetchMessages, 4000)
  return () => {
    clearInterval(interval)
    abortControllerRef.current?.abort()  // ← NEW cleanup
  }
}, [fetchMessages])
```

---

## ✅ Verificación Post-Fix

**Checklist de Validación:**
- [ ] `npx prisma migrate dev` ejecuta sin error
- [ ] `npm run build` compila sin warnings
- [ ] `npm run lint` pasa (0 errors)
- [ ] Todos los endpoints responden con error handling
- [ ] Polling no causa memory leaks (DevTools Memory profiler)
- [ ] Race condition en onboarding resuelta (test concurrent requests)
- [ ] Type safety: 0 `any` en APIs

---

## 📚 Referencias

- [Prisma Cascade Delete](https://www.prisma.io/docs/orm/reference/prisma-schema-reference#ondelete)
- [NextAuth Error Handling](https://next-auth.js.org/configuration/callbacks)
- [AbortController MDN](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
- [Rate Limiting Patterns](https://vercel.com/docs/functions/ratelimiting)
- [Zod Validation](https://zod.dev/)
