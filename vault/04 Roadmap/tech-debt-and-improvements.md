# Tech Debt & Mejoras — NEXUM

_Fecha de revisión: 7 mayo 2026 · Revisión: auditoría post-Fase 8 (TOTP)_

---

## Resumen ejecutivo

Se completó la implementación de autenticación TOTP (Fase 8), firma documental, notificaciones y sistema OTP por email. Esta revisión detecta **inconsistencias arquitecturales críticas**, **deudas técnicas bloqueantes** y un catálogo de optimizaciones para las siguientes fases.

---

## Acciones realizadas (7 mayo 2026)

- Implementado flujo TOTP completo server-side: `/api/2fa/setup`, `/api/2fa/enable`, `/api/2fa/validate`, `/api/2fa/disable`.
- Añadido `pendingTotpSecret` con TTL para evitar que el cliente envíe secretos arbitrarios.
- Usado `unstable_update` + ajuste en `jwt` callback para que `totpVerified` se escriba en la cookie JWT y se refleje inmediatamente en `auth()`.
- Middleware actualizado para redirigir a `/login?totp_required=1` cuando `totpEnabled && !totpVerified`.
- Añadidos tipos TypeScript: `src/types/next-auth.d.ts`.
- Añadidos scripts de prueba E2E: `scripts/http-test-totp.js` y `scripts/http-test-middleware.js` (tests locales pasados; `session.user.totpVerified: true`).
- Eliminados logs debug temporales y añadido rate-limiting a endpoints 2FA (in-memory). Migración a Redis/Upstash recomendada.
- Archivos clave cambiados: [src/auth.ts](src/auth.ts#L1-L200), [src/lib/totp.ts](src/lib/totp.ts#L1-L200), [middleware.ts](middleware.ts#L1-L200), [src/app/api/2fa/*], [src/types/next-auth.d.ts], [scripts/http-test-totp.js], [scripts/http-test-middleware.js].
- Centralizado acceso y actualización de `backupCodes` en `src/lib/backup-codes.ts` para facilitar migraciones futuras y evitar casteos dispersos.

Próximo: migrar `backupCodes` en Prisma a un tipo más explícito o tabla separada; migrar rate-limiter a Redis; añadir tests de integración en CI.

## 🔴 Crítico — Bloquean producción

### C-01 · `totpVerified` nunca persiste en el JWT

**Problema:** El endpoint `/api/2fa/validate` devuelve `{ ok: true }` pero **no actualiza el JWT**. Al redirigir, el token sigue teniendo `totpVerified: false`. El middleware rechazará todas las solicitudes posteriores o el cliente quedará en un loop infinito.

**Localización:** `src/app/api/2fa/validate/route.ts`, `src/components/totp-login-modal.tsx`

**Causa raíz:** NextAuth v5 con JWT strategy no puede mutar el token desde un endpoint externo. La única forma correcta es hacer un re-sign del token desde el propio callback `jwt`.

**Solución propuesta:**

1. Crear endpoint `/api/2fa/mark-verified` que:
   - Valide el token TOTP igual que `validate`
   - Responda con `Set-Cookie` actualizando el JWT session cookie via `signIn` o trigger de NextAuth
2. Alternativa más limpia: usar `unstable_update` de NextAuth v5 para mutar el token en caliente:
   ```ts
   // En /api/2fa/validate/route.ts:
   import { unstable_update } from '@/auth'
   // Tras verificar:
   await unstable_update({ user: { totpVerified: true } })
   ```
3. El middleware debe distinguir rutas que NO requieren `totpVerified` (la propia ruta de validate y `/login`).

---

### C-02 · Secret TOTP enviado desde el cliente en el flujo de activación

**Problema:** `/api/2fa/setup` (GET) genera y devuelve el secret al cliente. El cliente lo guarda en estado React y lo reenvía en `/api/2fa/enable`. Esto significa:

- Si el estado se pierde (recarga), hay que repetir el proceso, pero no hay protección contra que el cliente envíe un secret arbitrario.
- Un atacante con XSS puede inyectar un secret propio para activar un TOTP que controla él.

**Localización:** `src/app/api/2fa/setup/route.ts`, `src/app/api/2fa/enable/route.ts`

**Solución propuesta:**

1. `setup` almacena el secret temporalmente en la DB (`pendingTotpSecret`) con TTL de 10 minutos.
2. `enable` solo acepta el token TOTP; lee `pendingTotpSecret` de la DB, verifica, promueve a `totpSecret`, borra el pending.
3. Añadir campo `pendingTotpSecret String?` al schema Prisma.

```prisma
model User {
  // ...
  pendingTotpSecret String?  // TTL controlled by application layer
}
```

---

### C-03 · Sin rate-limiting en endpoints TOTP

**Problema:** Los endpoints `/api/2fa/*` no tienen rate-limiting. Un atacante puede hacer brute-force sobre los 1.000.000 códigos TOTP posibles o los 8 backup codes.

**Localización:** `src/app/api/2fa/validate/route.ts`, `src/app/api/2fa/disable/route.ts`, `src/app/api/2fa/enable/route.ts`

**Solución:**

```ts
// Añadir en cada endpoint 2FA:
import { checkRateLimit, getClientIp, getRateLimitKey } from '@/lib/rate-limit'
const key = getRateLimitKey(clientIp, session.user.id)
const { ok } = checkRateLimit(key, 5, 60) // 5 intentos/min
if (!ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
```

El middleware actual solo protege `/api/auth` y `/api/register`. Agregar `/api/2fa` a `RATE_LIMITED_ROUTES`.

---

### C-04 · `src/lib/totp.ts` usa `any` para el API de otplib

**Problema:** El módulo resuelve el API de `otplib` en runtime con `const o: any = otplib as any`. No hay garantía de que funcione con la versión instalada. Si el package se actualiza o la resolución falla, el TOTP deja de funcionar silenciosamente.

**Localización:** `src/lib/totp.ts`

**Solución:** Usar directamente el sub-package `@otplib/preset-default` que tiene typings estables:

```bash
npm i otplib
```

```ts
import { authenticator } from 'otplib'
// authenticator.generate(secret) → token
// authenticator.verify({ token, secret }) → boolean
// authenticator.generateSecret() → base32 secret
```

Verificar primero con `node -e "const { authenticator } = require('otplib'); console.log(authenticator.generateSecret())"`.

---

### C-05 · `backupCodes` tipado como `Json` en Prisma → `as any` necesario

**Problema:** `backupCodes Json?` en el schema no es type-safe. Cualquier `prisma.user.update({ data: { backupCodes: array } })` requiere `as any` o casteo manual. Esto puede ocultar bugs donde se guarda un dato inesperado.

**Solución:** Cambiar a `String[]` codificado como JSON string, o usar campo custom:

```prisma
model User {
  backupCodesRaw String? // JSON array of bcrypt hashes, max 8
}
```

Con helper:

```ts
function encodeBackupCodes(hashed: string[]) {
  return JSON.stringify(hashed)
}
function decodeBackupCodes(raw: string | null): string[] {
  return raw ? JSON.parse(raw) : []
}
```

---

## 🟠 Importante — Deuda técnica real

### I-01 · Middleware no bloquea usuarios con `totpEnabled && !totpVerified`

**Problema:** El middleware (`middleware.ts`) solo comprueba `!!session`. No redirige a un paso de verificación TOTP si el usuario tiene 2FA activado pero no ha completado el segundo factor.

**Localización:** `middleware.ts`

**Solución:**

```ts
// Después de comprobar que existe sesión, añadir:
const user = req.auth?.user as any
if (user?.totpEnabled && !user?.totpVerified) {
  // Permitir solo rutas de verificación
  const allow = ['/login', '/api/2fa/validate', '/api/auth']
  if (!allow.some((p) => pathname.startsWith(p))) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('totp', '1')
    return NextResponse.redirect(url)
  }
}
```

**Estado:** Implementado (7 mayo 2026) — middleware redirige correctamente a `/login?totp_required=1` para usuarios con `totpEnabled && !totpVerified`.

---

### I-02 · `otp-modal.tsx` — prop `collectOnly` no declarada en la interface `Props`

**Problema:** Se añadió `collectOnly` a la destructuración pero no está en el tipo `Props`. Causa error TS latente y confusión sobre qué hace ese prop.

**Localización:** `src/components/otp-modal.tsx`

**Solución:** Añadir a la interface:

```ts
type Props = {
  open: boolean
  email: string
  type?: OtpType | string
  onClose: () => void
  onValidated?: (code?: string) => void
  collectOnly?: boolean // si true, no valida contra API, solo recoge el código
}
```

---

### I-03 · JWT token no se refresca con cambios de `totpEnabled`

**Problema:** El JWT callback en `auth.ts` solo establece `totpEnabled` al momento del login inicial (`if (user)`). Si un usuario activa o desactiva TOTP después del login, el token queda obsoleto hasta que expire (30 días).

**Localización:** `src/auth.ts`

**Solución:** En la rama `else` del JWT callback, leer el estado actual de `totpEnabled` desde la DB:

```ts
} else {
  // Refresh from DB every 5 minutes max
  const now = Math.floor(Date.now() / 1000);
  const lastRefresh = (token.lastDbRefresh as number) ?? 0;
  if (now - lastRefresh > 300) {
    const fresh = await prisma.user.findUnique({
      where: { id: token.id as string },
      select: { totpEnabled: true, role: true }
    });
    if (fresh) {
      token.totpEnabled = fresh.totpEnabled;
      token.role = fresh.role;
    }
    token.lastDbRefresh = now;
  }
}
```

---

### I-04 · `settings/page.tsx` sin protección de ruta ni layout

**Problema:** La página `/settings` no tiene autenticación a nivel de página, ni está envuelta en el `AppShell` con sidebar. Un usuario no autenticado que llegue directamente obtiene error en `TwoFactorSettings` al llamar `/api/2fa/status`.

**Localización:** `src/app/settings/page.tsx`

**Solución:**

1. Añadir `export const dynamic = 'force-dynamic'` y verificar sesión server-side via `auth()`:

```ts
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const session = await auth();
**Estado:** Implementado (7 mayo 2026) — `src/app/settings/page.tsx` ahora exige sesión server-side y redirige a `/login` cuando no hay `session`.

  // ...
}
```

2. Envolver con `AppShell` o mover a la estructura `src/app/coach/` / `src/app/athlete/` según el rol.

---

### I-05 · Archivo duplicado: `coach-athlete-dashboard-settings.tsx`

**Problema:** El componente existe en dos rutas:

- `src/components/coach-athlete-dashboard-settings.tsx`
- `src/components/coach/coach-athlete-dashboard-settings.tsx`

**Solución:** Verificar cuál es la versión activa con imports y eliminar el duplicado.

---

### I-06 · `rate-limit.ts` usa Map en memoria (no apta para producción)

**Problema:** El rate limiter es in-process. En un entorno multi-instancia (Vercel, contenedores), cada instancia tiene su propio estado. El límite de 5 req/min por instancia se convierte en N×5.

**Solución futura:** Migrar a Redis (Upstash) o Vercel KV:

```ts
import { Redis } from '@upstash/redis'
const redis = new Redis({ url: process.env.UPSTASH_URL!, token: process.env.UPSTASH_TOKEN! })
```

---

### I-07 · Firma digital — falta contexto de IP en audit log de OTP

**Problema:** En `src/lib/otp.ts`, el `auditLog.create` guarda `ipAddress: undefined`. En `src/lib/signature.ts`, la IP se pasa como parámetro pero en la ruta `/api/documents/[id]/sign` hay que verificar que se extrae correctamente del request.

**Solución:** Pasar el `Request` o las headers a las funciones lib para poder extraer la IP:

```ts
await prisma.auditLog.create({
  data: {
    userId,
    action: 'otp_generated',
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] ?? null,
  },
})
```

---

### I-08 · Error message enumera usuarios en TOTP validate

**Problema:** `/api/2fa/validate` devuelve `{ error: "Usuario no encontrado" }` con status 404 cuando el userId de la sesión no existe en DB. Esto confirma al atacante que ese usuario fue eliminado.

**Solución:** Unificar respuesta en caso de fallo:

```ts
if (!user || !ok) return NextResponse.json({ error: 'Verificación fallida' }, { status: 400 })
```

---

## 🟡 Optimizaciones — Mejoran calidad/DX

### O-01 · Consolidar tipos de sesión extendida en un solo archivo

**Problema:** Los casteos `(session.user as { role?: string })`, `(session.user as { totpEnabled?: boolean })`, etc. aparecen en múltiples archivos (`auth.ts`, `login/page.tsx`, `two-factor-settings.tsx`, `middleware.ts`).

**Solución:** Crear `src/types/next-auth.d.ts` con módulo augmentation:

```ts
import 'next-auth'
declare module 'next-auth' {
  interface User {
    role?: string
    totpEnabled?: boolean
    totpVerified?: boolean
  }
  interface Session {
    user: User & {
      id: string
      role: string
      totpEnabled: boolean
      totpVerified: boolean
    }
  }
}
declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    role?: string
    totpEnabled?: boolean
    totpVerified?: boolean
    lastDbRefresh?: number
  }
}
```

---

### O-02 · `two-factor-settings.tsx` — UX mejorable

**Problema actual:**

- Dos botones "Deshabilitar (TOTP)" y "Deshabilitar (Backup)" pueden confundir al usuario. El sistema debería detectar si el input parece backup (8 chars hex) o TOTP (6 dígitos numéricos).
- Los backup codes se muestran solo una vez pero no hay botón de copiar al portapapeles.
- No hay feedback visual de loading (spinner).

**Mejoras propuestas:**

1. Auto-detectar tipo de código por formato:

```ts
function detectCodeType(code: string) {
  return /^\d{6}$/.test(code) ? 'totp' : 'backup'
}
```

2. Añadir botón "Copiar todos" para backup codes.
3. Añadir `aria-busy` y spinner en botones.

---

### O-03 · `totp-login-modal.tsx` — Sin timeout ni re-intento controlado

**Problema:** El modal no expira. Si el usuario deja la ventana abierta, puede intentar códigos ilimitadamente (desde UI, sin rate limit de servidor en el endpoint validate).

**Solución:**

1. Añadir un countdown de 5 minutos en el modal.
2. Cerrar y redirigir a login si expira.
3. Rate limit en `/api/2fa/validate` (ver C-03).

---

### O-04 · `prisma/schema.prisma` — Índices faltantes en tablas de notificaciones

**Problema:** `NotificationDelivery` y `OtpToken` no tienen índices explícitos en columnas de búsqueda frecuente (`userId`, `type`, `expiresAt`).

**Solución (migración):**

```prisma
model OtpToken {
  @@index([userId, type])
  @@index([expiresAt])
}
model NotificationDelivery {
  @@index([notificationId, channel])
}
```

---

### O-05 · Cron `/api/cron/notifications/process-pending` — Sin paginación

**Problema:** El cron procesa todas las notificaciones pendientes de una sola query. Con volumen alto puede agotar memoria o timeouts.

**Solución:** Procesar en batches:

```ts
const BATCH = 50
const pending = await prisma.notification.findMany({
  where: { status: 'PENDING' },
  take: BATCH,
  orderBy: { createdAt: 'asc' },
})
```

---

### O-06 · `src/lib/signature.ts` — Sin validación de extensión de archivo

**Problema:** Solo comprueba `mimeType === "application/pdf"` pero el `mimeType` puede ser manipulado al subir el documento. No valida la extensión real del archivo ni sus magic bytes.

**Solución:**

```ts
import { readFile } from 'fs/promises'
// Leer primeros 4 bytes y comprobar magic number PDF: %PDF
const header = Buffer.alloc(4)
const fd = await open(sourcePath, 'r')
await fd.read(header, 0, 4, 0)
await fd.close()
if (header.toString('ascii') !== '%PDF') {
  throw new Error('El archivo no es un PDF válido')
}
```

---

### O-07 · `next.config.ts` vacío — falta configuración de seguridad

**Problema:** `next.config.ts` no define headers de seguridad HTTP (CSP, HSTS, X-Frame-Options).

**Solución:**

```ts
const nextConfig: NextConfig = {
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    },
  ],
}
```

CSP requiere más trabajo (nonces para scripts inline).

---

### O-08 · `src/lib/otp.ts` — `Math.random()` no es criptográficamente seguro

**Problema:**

```ts
const code = Math.floor(100000 + Math.random() * 900000).toString()
```

`Math.random()` no es CSPRNG. Para códigos de autenticación se debe usar `crypto.randomInt`.

**Solución:**

```ts
import { randomInt } from 'crypto'
const code = randomInt(100000, 1000000).toString()
```

---

## 📋 Roadmap priorizado

| #   | ID   | Descripción                                      | Impacto    | Esfuerzo | Fase |
| --- | ---- | ------------------------------------------------ | ---------- | -------- | ---- |
| 1   | C-01 | Persistir `totpVerified` en JWT                  | 🔴 Crítico | M        | 8.1  |
| 2   | C-02 | Secret TOTP server-side (pendingTotpSecret)      | 🔴 Crítico | M        | 8.1  |
| 3   | C-03 | Rate-limit en endpoints `/api/2fa/*`             | 🔴 Crítico | S        | 8.1  |
| 4   | C-04 | Refactorizar `totp.ts` con API estable de otplib | 🔴 Crítico | S        | 8.1  |
| 5   | O-08 | Usar `crypto.randomInt` en OTP                   | 🔴 Crítico | XS       | 8.1  |
| 6   | I-01 | Middleware bloquea TOTP no verificado            | 🟠 Alto    | M        | 8.2  |
| 7   | I-02 | `collectOnly` en Props de otp-modal              | 🟠 Alto    | XS       | 8.2  |
| 8   | I-03 | JWT refresh con cambios de `totpEnabled`         | 🟠 Alto    | M        | 8.2  |
| 9   | C-05 | `backupCodes` tipado seguro                      | 🟠 Alto    | S        | 8.2  |
| 10  | I-04 | Proteger `/settings` con auth + layout           | 🟠 Alto    | S        | 8.2  |
| 11  | O-01 | Módulo augmentation NextAuth types               | 🟡 Medio   | S        | 9    |
| 12  | I-08 | Unificar mensajes de error 2FA                   | 🟡 Medio   | XS       | 9    |
| 13  | O-06 | Validar magic bytes PDF en firma                 | 🟡 Medio   | S        | 9    |
| 14  | O-07 | Headers de seguridad en next.config              | 🟡 Medio   | S        | 9    |
| 15  | I-05 | Eliminar componente duplicado                    | 🟡 Medio   | XS       | 9    |
| 16  | O-02 | UX mejoras TwoFactorSettings                     | 🟡 Medio   | M        | 9    |
| 17  | O-03 | Timeout en TotpLoginModal                        | 🟡 Medio   | S        | 9    |
| 18  | I-06 | Rate-limit con Redis para producción             | 🟡 Medio   | L        | 10   |
| 19  | O-04 | Índices en OtpToken/NotificationDelivery         | 🟡 Medio   | S        | 10   |
| 20  | O-05 | Batching en cron notificaciones                  | 🟡 Medio   | S        | 10   |
| 21  | I-07 | IP en audit log de OTP                           | 🟢 Bajo    | XS       | 10   |

**Leyenda esfuerzo:** XS < 1h · S = 1-3h · M = 3-8h · L > 8h

---

## Fase 8.1 — Hotfixes críticos (siguiente sprint)

Estos 5 ítems bloquean que el flujo 2FA funcione en producción:

1. **C-04** Reescribir `src/lib/totp.ts` con import directo de `otplib`
2. **C-02** Guardar `pendingTotpSecret` en DB durante setup; quitar secret del request de enable
3. **C-01** Usar `unstable_update` de NextAuth para marcar `totpVerified` tras validate
4. **C-03** Añadir rate-limit a middleware para rutas `/api/2fa/*`
5. **O-08** Reemplazar `Math.random()` por `crypto.randomInt` en `src/lib/otp.ts`

---

## Fase 8.2 — Correcciones de seguridad y estabilidad

1. **I-01** Middleware redirige si `totpEnabled && !totpVerified`
2. **I-03** JWT refresh parcial desde DB cada 5 minutos
3. **I-04** Settings page con auth guard + AppShell
4. **C-05** Migrar `backupCodes` de `Json` a campo String serializado
5. **I-02** Añadir `collectOnly?: boolean` a Props de `OtpModal`
6. **I-08** Unificar respuestas de error en endpoints 2FA

---

_Generado automáticamente por auditoría técnica · 07/05/2026_
