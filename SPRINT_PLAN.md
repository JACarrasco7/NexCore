# SPRINT 4 — Navegación, UX, Escalabilidad y Facturación

> **Fecha:** 9 mayo 2026  
> **Estado:** PLANIFICADO  
> **Prioridad:** Alta

---

## Contexto y Diagnóstico

Revisión completa de flujo, lógica, base de datos, navegación y accesibilidad.  
Hallazgos detectados combinando los ítems del usuario con análisis propio del codebase.

---

## BLOQUE A — Navegación (Crítico)

### A-1 · Fix dropdown hover gap (bug UX crítico)

**Problema detectado en `app-shell.tsx`:**

```tsx
// ACTUAL — mt-1 crea un gap de 4px entre botón y menú
<div className="absolute top-full left-0 mt-1 w-48 ...">
```

Cuando el ratón entra en ese gap de 4px, `onMouseLeave` del botón dispara y el menú desaparece.  
Si el usuario mueve el ratón despacio (en diagonal) no llega al menú → se cierra.

**Fix propuesto: delay en mouseLeave con `clearTimeout`**

```tsx
function NavDropdown({ group }: { group: NavGroup }) {
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleEnter() {
    if (timer.current) clearTimeout(timer.current)
    setOpen(true)
  }

  function handleLeave() {
    timer.current = setTimeout(() => setOpen(false), 150) // 150ms grace
  }

  return (
    <div className="relative">
      <button onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
        ...
      </button>
      {open && (
        <div
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
          className="absolute top-full left-0 w-48 ..." // sin mt-1
        >
          {/* items */}
        </div>
      )}
    </div>
  )
}
```

**Archivos afectados:**

- `src/components/app-shell.tsx` — función `NavDropdown`

**Esfuerzo:** 30 min  
**Prioridad:** P0 (bug)

---

### A-2 · Reestructurar navbar Coach

**Problema:**

- Dashboard en navbar es redundante (el logo ya lleva a `/coach`)
- "Configuración" no tiene sentido como label de grupo
- "Mi perfil" no debe estar en el nav — solo en el dropdown del usuario
- Falta "Nutrición" como ítem de primer nivel

**Estructura ACTUAL:**

```
Dashboard     → /coach (redundante)
Atletas       → Lista + Comparar
Entrenamiento → Planes + Import rutinas + Import nutrición
Comunicación  → Mensajes + Gestión equipo + Muro
Configuración → Mi perfil + Config equipo + Catálogo  ← mal agrupado
```

**Estructura PROPUESTA:**

```
Atletas       → /coach/athletes (lista) + /coach/compare (comparar)
Entrenamiento → /coach/service-plans + /coach/import-lab
Nutrición     → /coach/nutrition + /coach/import-lab/nutrition  ← NUEVO
Comunicación  → /coach/messages + /coach/wall
Team          → /coach/team + /coach/team/settings + /coach/team/billing  ← renombrado
```

> **Regla:** El logo NX → lleva a `/coach` (dashboard)  
> **Mi perfil** → solo en `UserMenu` (dropdown usuario arriba derecha)

**Navbar Atleta — ACTUAL:**

```
Dashboard     → /athlete (redundante)
Entrenamiento → Mi rutina + Registro
Seguimiento   → Check-in periódico + Log diario + Nutrición + Fotos
Social        → Chat + Muro
```

**Navbar Atleta — PROPUESTA:**

```
Entrenamiento → /athlete/plan + /athlete/training-log
Revisiones    → /athlete/check-in + /athlete/daily-log  ← renombrado
Nutrición     → /athlete/nutrition
Progreso      → /athlete/progress
Social        → /athlete/chat + /athlete/wall
```

> **Regla:** Dashboard atleta accesible via logo NX únicamente

**Archivos afectados:**

- `src/components/app-shell.tsx` — `COACH_NAV_GROUPS`, `ATHLETE_NAV_GROUPS`
- `src/components/user-menu.tsx` — verificar que "Mi perfil" está en coach dropdown

**Esfuerzo:** 1-2 h  
**Prioridad:** P1

---

### A-3 · Renombrar "Check-in" → "Revisión / Revisiones"

**Problema:** "Check-in" es anglicismo. El concepto correcto: el atleta manda una **revisión** periódica al coach.

**Cambios de label (no URL):**

| Ubicación                   | Texto actual                 | Texto nuevo                               |
| --------------------------- | ---------------------------- | ----------------------------------------- |
| `app-shell.tsx`             | "Check-in periódico"         | "Revisión periódica"                      |
| `app-shell.tsx`             | grupo "Seguimiento"          | "Revisiones" (si aplica)                  |
| `athlete/page.tsx`          | "Próximo check-in"           | "Próxima revisión"                        |
| `athlete/page.tsx`          | Link "Hacer check-in →"      | "Enviar revisión →"                       |
| `athlete/check-in/page.tsx` | eyebrow "Check-in periódico" | "Revisión semanal"                        |
| `athlete/check-in/page.tsx` | title                        | "Revisión para el coach"                  |
| `coach/page.tsx`            | "Check-ins pendientes"       | "Revisiones pendientes"                   |
| `coach/athletes/[id]`       | tab "Check-ins"              | tab "Revisiones"                          |
| Notificaciones              | REMINDER_CHECK_IN type       | label display: "Recordatorio de revisión" |

> ⚠️ Las URLs `/athlete/check-in` no cambian (evitar romper rutas y SEO)  
> ⚠️ El enum `NotificationType.REMINDER_CHECK_IN` no cambia (solo el label display)

**Archivos afectados:**

- `src/components/app-shell.tsx`
- `src/app/athlete/page.tsx`
- `src/app/athlete/check-in/page.tsx`
- `src/app/coach/page.tsx`
- `src/app/coach/athletes/[id]/page.tsx`

**Esfuerzo:** 45 min  
**Prioridad:** P1

---

## BLOQUE B — Facturación y Registro Coach

### B-1 · Flujo registro coach (sin invitación obligatoria)

**Estado actual:**

- Coach se registra con `/register` → se crea `Coach` + `Team` + `TeamUserMembership` automáticamente ✅
- Existe `CoachInvite` para añadir coaches adicionales a un equipo existente

**Aclaración del usuario:**

> "no seria invitar, seria mismo datos que el coach cuando se registra normal, pero para editar y gestionar la facturacion puede hacerlo cualquier coach pero debe estar verificado"

**Interpretación:**

- Flujo de registro es correcto — coach se registra normalmente, no hay "invitación" obligatoria
- `CoachInvite` puede mantenerse solo para añadir coaches MIEMBRO a un equipo existente
- **La gestión de facturación (NEXUM) requiere `User.emailVerified !== null`**

**Cambios necesarios:**

1. **Renombrar flow en UI**: "/coach/team" → sección "Agregar coach al equipo" (no "Invitar")
2. **Gate de facturación**: check `emailVerified` antes de permitir acceso a `/coach/team/billing`
3. **Mejorar onboarding coach**: mostrar claramente que ya tienen su equipo creado

**Archivos afectados:**

- `src/app/coach/team/page.tsx`
- `src/app/api/coach/invites/` (renombrar labels en UI)
- Nueva página: `src/app/coach/team/billing/page.tsx`

**Esfuerzo:** 1-2 h  
**Prioridad:** P1

---

### B-2 · Modelo de facturación NEXUM (DB + API)

**Problema detectado en schema:**

```prisma
model Coach {
  trialStartsAt DateTime @default(now())
  trialEndsAt   DateTime
  // ← No hay modelo de billing real
}
```

Solo hay un campo de prueba. No hay registro de:

- Plan de suscripción a NEXUM
- Estado de pago (activo, vencido, cancelado)
- Historial de pagos
- Método de pago (externo, referencia)

**DB — Nueva migración propuesta:**

```prisma
model CoachBillingPlan {
  id            String              @id @default(cuid())
  coachId       String              @unique
  plan          NexumPlan           @default(TRIAL)
  status        BillingStatus       @default(TRIAL)
  currentPeriodStart DateTime       @default(now())
  currentPeriodEnd   DateTime
  cancelledAt   DateTime?
  paymentMethod String?             // "stripe", "manual", etc.
  externalRef   String?             @db.Text // stripe_subscription_id o similar
  notes         String?             @db.Text // notas admin
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt

  coach Coach @relation(fields: [coachId], references: [id], onDelete: Cascade)

  @@index([status, currentPeriodEnd])
  @@index([coachId])
}

enum NexumPlan {
  TRIAL
  STARTER      // básico
  PRO          // con nutrición, posing, etc.
  ENTERPRISE   // multi-equipo
}

enum BillingStatus {
  TRIAL
  ACTIVE
  PAST_DUE
  CANCELLED
  EXPIRED
}
```

> Integrar en `Coach` como `billingPlan CoachBillingPlan?`

**API — Nuevos endpoints:**

```
GET  /api/billing            → Estado de billing del coach autenticado
POST /api/billing/upgrade    → Solicitar upgrade de plan (requiere emailVerified)
POST /api/billing/cancel     → Cancelar suscripción (requiere emailVerified)
GET  /api/billing/history    → Historial (requiere emailVerified)
```

**Gate de verificación en todos los endpoints billing:**

```typescript
if (!session.user.emailVerified) {
  return NextResponse.json(
    { error: 'Debes verificar tu email para gestionar la facturación' },
    { status: 403 }
  )
}
```

**Esfuerzo:** 3-4 h  
**Prioridad:** P2

---

### B-3 · Página /coach/team/billing

**Nueva página** para gestión de facturación NEXUM.

**Acceso:**

- Cualquier coach con `emailVerified !== null`
- Si no verificado → banner "Verifica tu email para gestionar facturación"

**Contenido:**

```
┌─ Plan actual ──────────────────────────────────────────┐
│  Plan: TRIAL · Expira: 9 junio 2026                   │
│  Estado: ✅ Activo                                     │
│  [Upgrade a Pro] [Ver planes]                          │
└────────────────────────────────────────────────────────┘

┌─ Historial de pagos ────────────────────────────────────┐
│  Fecha       Plan    Importe   Estado                   │
│  01/05/2026  Trial   0€        Trial gratuito           │
└────────────────────────────────────────────────────────┘

┌─ Verificación de email ─────────────────────────────────┐
│  ⚠️ Tu email no está verificado                        │
│  [Reenviar verificación]                               │
└────────────────────────────────────────────────────────┘
```

**Archivos:**

- `src/app/coach/team/billing/page.tsx` (nueva)
- `src/app/api/billing/route.ts` (nueva)

**Esfuerzo:** 2 h  
**Prioridad:** P2

---

## BLOQUE C — Escalabilidad DB y Backend

### C-1 · Eliminar campo deprecated `Team.contractTemplate`

**Problema:**

```prisma
model Team {
  contractTemplate String? @db.Text  // @deprecated — usar TeamSettings.contractTemplate
}
```

Campo marcado como deprecated pero aún en schema activo. Todos los accesos ya usan `TeamSettings.contractTemplate`.

**Acción:**

1. Crear migración `drop_team_contract_template`
2. Actualizar cualquier API que lea `team.contractTemplate` directo
3. Actualizar `src/app/api/teams/contract/route.ts`

**Verificar con:**

```bash
grep -r "contractTemplate" src/app/api/
```

**Esfuerzo:** 30 min  
**Prioridad:** P2

---

### C-2 · Índices faltantes en Coach para billing y expiración

**Problema:** Consultas de expiración de trial no tienen índice eficiente.

**Migración propuesta:**

```prisma
model Coach {
  // Añadir índice para consultas de expiración
  @@index([trialEndsAt])
  @@index([userId, trialEndsAt])
}
```

**Uso típico sin índice:**

```sql
-- Dashboard admin: coaches con trial a punto de expirar
SELECT * FROM Coach WHERE trialEndsAt < NOW() + INTERVAL 7 DAY
-- → Full table scan sin índice
```

**Esfuerzo:** 15 min  
**Prioridad:** P3

---

### C-3 · Limpiar `CoachInvite` y clarificar su rol

**Problema:** `CoachInvite` mezcla conceptos:

- Invitación a un coach MIEMBRO a un equipo existente ✅ (use case válido)
- Pero el nombre "Invite" sugiere que coaches no pueden registrarse solos ❌

**Acción:**

- Mantener `CoachInvite` para añadir coaches miembro a equipos ya existentes
- Renombrar `invitedEmail` → clarificar en UI que es "Añadir coach al equipo"
- Limpiar tokens expirados: añadir cron job o endpoint admin de limpieza
- Añadir índice si no existe: `@@index([expiresAt, acceptedAt])` ← ya existe ✅

**Esfuerzo:** 30 min  
**Prioridad:** P3

---

### C-4 · Rate limiting en endpoints sensibles

**Problema detectado:** Los endpoints de OTP/verificación no tienen rate limiting explícito en código.

**Endpoints críticos sin rate limit obvio:**

- `POST /api/otp/send` — envío de OTP SMS
- `POST /api/register` — registro de usuario
- `POST /api/auth/send-otp` — OTP verificación teléfono

**Solución propuesta (middleware o edge):**

```typescript
// src/middleware.ts — añadir rate limiting por IP
import { ipRateLimit } from '@/lib/rate-limit'

const SENSITIVE_PATHS = ['/api/otp/', '/api/register', '/api/auth/send-']

export async function middleware(request: NextRequest) {
  if (SENSITIVE_PATHS.some((p) => request.nextUrl.pathname.startsWith(p))) {
    const limited = await ipRateLimit(request, { max: 5, window: '1m' })
    if (limited) return NextResponse.json({ error: 'Demasiados intentos' }, { status: 429 })
  }
  // ... resto del middleware
}
```

**Esfuerzo:** 1-2 h  
**Prioridad:** P1 (seguridad)

---

### C-5 · Validar emailVerified en operaciones críticas

**Problema:** Actualmente `emailVerified` se usa solo en onboarding. No se verifica antes de:

- Crear atletas en bulk
- Gestionar equipo
- Acceder a billing

**Patrón a implementar en APIs críticas:**

```typescript
// Helper reutilizable
function assertEmailVerified(session: Session) {
  const ev = (session.user as { emailVerified?: Date | null }).emailVerified
  if (!ev) {
    throw new ApiError(403, 'Verifica tu email para realizar esta acción')
  }
}
```

**APIs a actualizar:**

- `POST /api/billing/*` — gate obligatorio
- `POST /api/coach/invites` — gate recomendado
- `DELETE /api/athletes/:id` — gate recomendado

**Esfuerzo:** 1 h  
**Prioridad:** P2

---

## BLOQUE D — Accesibilidad y UX

### D-1 · Navegación por teclado en dropdowns

**Problema:** Los dropdowns del navbar no soportan teclado.

**Comportamiento esperado:**

- `Enter` / `Space` → abre el dropdown
- `ArrowDown` → mueve foco al primer ítem
- `ArrowUp` → mueve foco al ítem anterior
- `Escape` → cierra el dropdown y vuelve el foco al botón
- `Tab` → navega entre ítems y cierra al salir

**Implementación en `NavDropdown`:**

```tsx
function NavDropdown({ group }: { group: NavGroup }) {
  const [open, setOpen] = useState(false)
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const buttonRef = useRef<HTMLButtonElement>(null)

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false)
      buttonRef.current?.focus()
    }
    if (e.key === "ArrowDown" && open) {
      e.preventDefault()
      itemRefs.current[0]?.focus()
    }
  }

  function handleItemKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === "ArrowDown") itemRefs.current[index + 1]?.focus()
    if (e.key === "ArrowUp") {
      e.preventDefault()
      if (index === 0) buttonRef.current?.focus()
      else itemRefs.current[index - 1]?.focus()
    }
    if (e.key === "Escape") {
      setOpen(false)
      buttonRef.current?.focus()
    }
  }

  return (
    <div role="navigation">
      <button
        ref={buttonRef}
        aria-haspopup="true"
        aria-expanded={open}
        onKeyDown={handleKeyDown}
        ...
      />
      {open && (
        <div role="menu">
          {group.routes.map((route, i) => (
            <Link
              ref={(el) => { itemRefs.current[i] = el }}
              role="menuitem"
              onKeyDown={(e) => handleItemKeyDown(e, i)}
              ...
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

**Esfuerzo:** 1.5 h  
**Prioridad:** P2

---

### D-2 · Skip link "Saltar al contenido principal"

**Problema:** Sin skip link, usuarios de teclado deben tabular por toda la nav.

**Implementación:** Añadir al inicio del `AppShell`:

```tsx
<a
  href="#main-content"
  className="focus:bg-accent sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
>
  Saltar al contenido
</a>
```

Y en el `{children}`:

```tsx
<main id="main-content" tabIndex={-1}>
  {children}
</main>
```

**Esfuerzo:** 20 min  
**Prioridad:** P2

---

### D-3 · Botones con solo icono → aria-label

**Problema:** Varios botones (hamburguesa, toggle tema, notification bell) no tienen texto visible descriptivo.

**Casos detectados:**

- Botón hamburguesa: ya tiene `aria-label` ✅
- `ThemeToggle`: verificar `aria-label`
- `NotificationBell`: verificar `aria-label`
- Botones de acción en tablas (editar, borrar): solo iconos

**Fix pattern:**

```tsx
<button aria-label="Cambiar tema">{/* icono */}</button>
```

**Esfuerzo:** 30 min  
**Prioridad:** P2

---

### D-4 · Focus trap en modales

**Problema:** Los modales (`src/components/ui/modal.tsx`) pueden no tener focus trap completo.

**Comportamiento esperado:**

- Al abrir modal → foco va al primer elemento interactivo
- `Tab` cicla solo dentro del modal
- `Escape` cierra el modal
- Al cerrar → foco vuelve al elemento que lo abrió

**Solución:** Usar `<dialog>` nativo (ya implementado en algunos componentes) que maneja el focus trap automáticamente, o añadir librería de focus trap.

**Esfuerzo:** 45 min  
**Prioridad:** P2

---

### D-5 · Estados de carga con skeletons consistentes

**Problema:** Algunas páginas muestran un spinner genérico, otras nada, otras `Skeleton`.

**Regla a aplicar (ver `COMPONENT_ADOPTION.md`):**

- Listas → skeleton rows
- Cards → skeleton cards
- Formularios → skeleton inputs
- Stats → skeleton stat-cards

**Páginas que necesitan review:**

- `/coach/athletes` — tiene spinner, añadir skeletons
- `/coach/service-plans` — tiene spinner
- `/athlete/plan` — skeleton parcial

**Esfuerzo:** 1.5 h  
**Prioridad:** P3

---

### D-6 · Mensajes de error más descriptivos

**Problema:** Algunos errores de API devuelven mensajes genéricos.

**Patrón propuesto:**

```typescript
// Antes
return NextResponse.json({ error: 'Error interno' }, { status: 500 })

// Después
return NextResponse.json(
  {
    error: 'No se pudieron cargar los atletas',
    code: 'ATHLETES_FETCH_ERROR',
  },
  { status: 500 }
)
```

Y en frontend: mostrar el `error` del body, no solo "Error".

**Esfuerzo:** 1 h  
**Prioridad:** P3

---

### D-7 · Feedback de confirmación más claro

**Problema:** Acciones destructivas (borrar atleta, borrar plan) tienen confirmaciones pero el modal no es siempre descriptivo.

**Mejora:**

```tsx
<ConfirmDialog
  title="¿Eliminar atleta?"
  message={`Estás a punto de eliminar a ${athlete.fullName}. 
    Esta acción no se puede deshacer y borrará 
    ${athlete.sessionCount} sesiones y ${athlete.checkInCount} revisiones.`}
  confirmLabel="Sí, eliminar"
  cancelLabel="Cancelar"
  variant="destructive"
/>
```

**Esfuerzo:** 45 min  
**Prioridad:** P3

---

## BLOQUE E — Otras mejoras detectadas

### E-1 · Dashboard del coach: hacer útil o simplificar

**Problema:** El coach tiene un dashboard completo en `/coach` (cola operativa, atletas en riesgo, sesiones recientes). Es útil, pero el usuario dice que "no tiene por qué tener [un item en el navbar] ya que solo es 1".

**Decisión:** El logo NX lleva a `/coach` (home = dashboard). No hace falta item en nav.

**Pero el dashboard en sí es bueno** — mantenerlo tal cual. Solo quitar el item "Dashboard" del navbar.

**Esfuerzo:** 10 min (solo quitar de nav)  
**Prioridad:** P0

---

### E-2 · Revisión de aside del atleta

**Problema:** El aside del atleta en `/athlete/page.tsx` muestra "Próximo check-in" → renombrar.

```tsx
// Antes
<p className="text-[10px] uppercase ... text-accent/70">Próximo check-in</p>
<Link href="/athlete/check-in">Hacer check-in →</Link>

// Después
<p className="text-[10px] uppercase ... text-accent/70">Próxima revisión</p>
<Link href="/athlete/check-in">Enviar revisión →</Link>
```

**Archivos:**

- `src/app/athlete/page.tsx`
- `src/components/athlete-aside.tsx`

**Esfuerzo:** 10 min  
**Prioridad:** P1

---

### E-3 · Consolidar importaciones CSV en una sola sección

**Problema:** En nav hay dos imports separados ("Importar rutinas" e "Importar nutrición") que podrían estar en un solo ítem "Import Lab" con tabs internos.

**Propuesta:**

```
Entrenamiento → /coach/service-plans + /coach/import-lab
Nutrición     → /coach/nutrition + /coach/import-lab/nutrition
```

El usuario ya tiene `/coach/import-lab` con tabs. Es mejor navegar así.

**Esfuerzo:** 0 (ya implementado, solo reorganizar nav)  
**Prioridad:** P1

---

### E-4 · Móvil: mejorar cierre del drawer

**Problema:** El drawer móvil se cierra al navegar ✅ pero no tiene overlay clickeable para cerrar.

**Fix:**

```tsx
{menuOpen && (
  <>
    {/* Overlay de fondo */}
    <div
      className="fixed inset-0 z-20 bg-black/30 backdrop-blur-sm lg:hidden"
      onClick={() => setMenuOpen(false)}
      aria-hidden="true"
    />
    {/* Drawer */}
    <div id="mobile-nav-drawer" ...>
      ...
    </div>
  </>
)}
```

**Esfuerzo:** 20 min  
**Prioridad:** P2

---

### E-5 · Coach sin equipo: flujo de error claro

**Problema detectado en API:**

```typescript
if (coachMemberships.length === 0) {
  return NextResponse.json(
    {
      error: 'El coach no tiene equipos asignados...',
    },
    { status: 400 }
  )
}
```

Si el registro falla al crear el team, el coach queda en estado inválido. No hay flujo de recuperación en UI.

**Propuesta:**

- Middleware check: si coach autenticado no tiene TeamUserMembership activo, redirigir a `/coach/setup-team`
- Página `/coach/setup-team` con botón "Crear mi equipo"
- Este edge case es raro pero debe manejarse elegantemente

**Esfuerzo:** 1 h  
**Prioridad:** P2

---

### E-6 · Unread notifications badge en nav items relevantes

**Problema:** La `NotificationBell` muestra el total, pero no hay indicación visual en el nav item de Mensajes.

**Mejora:** Añadir badge de unread en "Mensajes" si hay mensajes sin leer:

```tsx
routes: [
  { href: '/coach/messages', label: 'Mensajes', icon: '💬', badgeKey: 'messages' },
  ...
]
```

Y pasar el count al `NavDropdown` desde el estado global.

**Esfuerzo:** 45 min  
**Prioridad:** P3

---

## BLOQUE F — Documentación y Testing

### F-1 · Actualizar COMPONENT_ADOPTION.md

Tras los cambios de nav, actualizar:

- Dropdown pattern con el nuevo fix de gap
- Keyboard nav pattern

### F-2 · Crear test para endpoints críticos

Endpoints sin tests detectados:

- `/api/register` — flujo completo
- `/api/otp/send` — rate limit y validación
- `/api/billing/*` — nuevo

---

## Resumen de Prioridades

| Prioridad | ID  | Tarea                                  | Esfuerzo |
| --------- | --- | -------------------------------------- | -------- |
| **P0**    | A-1 | Fix dropdown hover gap                 | 30 min   |
| **P0**    | E-1 | Quitar Dashboard de navbar             | 10 min   |
| **P1**    | A-2 | Reestructurar navbar Coach + Atleta    | 2 h      |
| **P1**    | A-3 | Renombrar Check-in → Revisiones        | 45 min   |
| **P1**    | B-1 | Flujo coach sin invitación obligatoria | 1-2 h    |
| **P1**    | C-4 | Rate limiting endpoints OTP/register   | 1-2 h    |
| **P1**    | E-2 | Aside atleta: renombrar check-in       | 10 min   |
| **P1**    | E-3 | Consolidar imports en nav              | 0        |
| **P2**    | B-2 | Modelo billing NEXUM (DB + API)        | 3-4 h    |
| **P2**    | B-3 | Página /coach/team/billing             | 2 h      |
| **P2**    | C-1 | Drop campo deprecated contractTemplate | 30 min   |
| **P2**    | C-5 | Validar emailVerified en APIs críticas | 1 h      |
| **P2**    | D-1 | Teclado en dropdowns (a11y)            | 1.5 h    |
| **P2**    | D-2 | Skip link contenido                    | 20 min   |
| **P2**    | D-3 | Aria-label en botones icono            | 30 min   |
| **P2**    | D-4 | Focus trap en modales                  | 45 min   |
| **P2**    | E-4 | Overlay móvil drawer                   | 20 min   |
| **P2**    | E-5 | Coach sin equipo: flujo error          | 1 h      |
| **P3**    | C-2 | Índices DB para billing                | 15 min   |
| **P3**    | C-3 | Limpiar CoachInvite y cron cleanup     | 30 min   |
| **P3**    | D-5 | Skeletons consistentes                 | 1.5 h    |
| **P3**    | D-6 | Errores descriptivos API               | 1 h      |
| **P3**    | D-7 | Confirmaciones destructivas mejoradas  | 45 min   |
| **P3**    | E-6 | Badge unread en nav item Mensajes      | 45 min   |

**Total estimado P0+P1:** ~6.5 h  
**Total estimado P2:** ~8.5 h  
**Total estimado P3:** ~4.5 h

---

## Orden de implementación recomendado

```
Día 1 (P0 + P1 fáciles):
  → A-1: Fix dropdown gap
  → E-1: Quitar Dashboard de nav
  → E-2: Renombrar aside atleta
  → A-3: Renombrar Check-in → Revisiones

Día 2 (P1 complejos):
  → A-2: Reestructurar navbar completo
  → B-1: Flujo coach (labels UI)
  → C-4: Rate limiting OTP

Día 3 (P2 DB + Billing):
  → C-1: Drop deprecated field + migración
  → B-2: Modelo CoachBillingPlan + migración
  → B-3: Página billing
  → C-5: emailVerified gate en APIs

Día 4 (P2 Accesibilidad):
  → D-1: Teclado en dropdowns
  → D-2: Skip link
  → D-3: Aria-labels
  → D-4: Focus trap
  → E-4: Overlay móvil
  → E-5: Coach sin equipo
```

---

## Definición de "Hecho" por bloque

- **Bloque A:** Dropdown no se cierra al mover ratón lento · Nav coach tiene 5 grupos · Nav atleta tiene 5 grupos · No hay "Dashboard" en nav · "Mi perfil" solo en user menu · Todo texto "check-in" → "revisión"
- **Bloque B:** Coach puede registrarse normalmente · Página billing existe · Billing requiere emailVerified · Modelo `CoachBillingPlan` en DB
- **Bloque C:** Sin campo deprecated en schema · Rate limiting activo en OTP · emailVerified verificado en APIs billing
- **Bloque D:** Dropdowns navegables con teclado · Skip link funcional · Todos los botones icono tienen aria-label · Modales con focus trap · Overlay móvil cierra drawer
- **Bloque E:** Logo lleva a /coach · Aside atleta con texto "revisión" · Imports en grupos nav correctos

---

_Generado: 9 mayo 2026 · NEXUM CARRIX Tech v0.1_
