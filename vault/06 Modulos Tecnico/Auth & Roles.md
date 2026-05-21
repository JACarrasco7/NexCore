# 🔐 Autenticación y Control de Acceso (Auth & RBAC)

**Versión**: 1.0  
**Framework**: NextAuth.js v5  
**Adaptador**: @auth/prisma-adapter  
**Fecha**: 14 de mayo de 2026

---

## 🎯 Propósito

Sistema completo de autenticación y autorización con dos niveles de RBAC:
- **User.role**: Rol global (COACH, ATHLETE, ADMIN)
- **TeamUserMembership.role**: Rol dentro del equipo (ADMIN, MEMBER)

---

## 🗄️ Modelos de Autenticación

### 1. User (Modelo Principal)

```prisma
model User {
  id                   String    @id @default(cuid())
  name                 String?
  email                String    @unique
  emailVerified        DateTime?
  image                String?
  passwordHash         String?
  
  // 2FA (TOTP)
  totpSecret           String?   @db.Text
  pendingTotpSecret    String?   @db.Text
  pendingTotpExpiresAt DateTime?
  totpEnabled          Boolean   @default(false)
  backupCodes          Json?     // Array de códigos de backup
  
  // Rol global
  role                 Role      @default(ATHLETE)
  
  // Estado
  isActive             Boolean   @default(true)
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt
  
  // RELACIONES
  accounts             Account[]              // OAuth (Google, etc.)
  sessions             Session[]              // NextAuth sessions
  coachProfile         Coach?
  athleteProfile       Athlete?
  teamMemberships      TeamUserMembership[]   // RBAC de equipos
  otpTokens            OtpToken[]
  auditLogs            AuditLog[]
  invoicesCreated      Invoice[]              // Facturas que creó
}

enum Role {
  COACH      // Puede crear equipos, atletas, planes, suscribirse
  ATHLETE    // Puede registrarse, recibir planes, registrar sesiones
  ADMIN      // Acceso administrativo completo (super-admin)
}
```

---

### 2. Account (OAuth)

```prisma
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String  // "google", "github", "credentials"
  providerAccountId String
  
  user              User    @relation(...)
  
  @@unique([provider, providerAccountId])
}
```

**Proveedores soportados**:
- `credentials`: Email + password (custom)
- `google`: Google OAuth 2.0
- `github`: GitHub OAuth 2.0

---

### 3. Session (NextAuth v5)

```prisma
model Session {
  id        String   @id @default(cuid())
  sessionToken String @unique
  userId    String
  expires   DateTime
  
  user      User     @relation(...)
}
```

**Tipo de sesión**: JWT (JSON Web Token)  
**Duración**: 30 días  
**Renovación**: Automática en cada acceso

---

### 4. TeamUserMembership (RBAC de Equipo)

```prisma
model TeamUserMembership {
  id        String   @id @default(cuid())
  teamId    String
  userId    String
  role      TeamRole @default(MEMBER)
  joinedAt  DateTime @default(now())
  createdAt DateTime @default(now())
  
  team      Team     @relation(...)
  user      User     @relation(...)
  
  @@unique([teamId, userId])
  @@index([teamId, role])
}

enum TeamRole {
  ADMIN       // Control total del equipo
  MEMBER      // Acceso limitado
}
```

---

## 🔐 Dos Niveles de RBAC

### Nivel 1: Rol Global (User.role)

| Rol | Permisos | Casos de Uso |
|-----|----------|-------------|
| **COACH** | Crear equipos, crear atletas, crear planes, suscribirse a APP | Profesional de fitness |
| **ATHLETE** | Registrarse, ver planes asignados, registrar sesiones, ver métricas | Cliente/Deportista |
| **ADMIN** | Todo (super-admin del sistema) | Soporte, desarrollador |

---

### Nivel 2: Rol en Equipo (TeamUserMembership.role)

Cuando un usuario (coach) pertenece a un equipo:

| Rol | Permisos en Equipo |
|-----|-------------------|
| **ADMIN** | Crear planes, invitar atletas, ver facturas, gestionar equipo |
| **MEMBER** | Crear planes (propios), ver atletas (propios) |

---

## 🔑 Conceptos Clave

### COACH_ADMIN

**Definición**: Coach con rol ADMIN en su equipo.

**Validación típica en endpoints**:
```typescript
const membership = await prisma.teamUserMembership.findUnique({
  where: { teamId_userId: { teamId: req.params.teamId, userId: session.user.id } },
})

if (!membership || membership.role !== 'ADMIN') {
  return res.status(403).json({ error: 'Require COACH_ADMIN role' })
}
```

**Permisos COACH_ADMIN**:
- ✅ Suscribirse a app (crear CoachSubscription)
- ✅ Ver/crear planes de facturación
- ✅ Invitar atletas
- ✅ Asignar atletas a planes
- ✅ Ver facturas del equipo
- ✅ Gestionar miembros del equipo

---

### Session Data Structure

```typescript
interface Session {
  user: {
    id: string           // User.id
    email: string        // User.email
    name: string | null  // User.name
    image: string | null // User.image
    role: "COACH" | "ATHLETE" | "ADMIN" // User.role
  }
  expires: string  // ISO 8601 timestamp
}
```

---

## 🔌 API de Autenticación

### POST /api/auth/register
Registra nuevo usuario

**Body**:
```json
{
  "email": "athlete@example.com",
  "password": "secure_password_123",
  "name": "Juan Pérez",
  "role": "ATHLETE"  // o "COACH"
}
```

**Respuesta (201)**:
```json
{
  "id": "user-123",
  "email": "athlete@example.com",
  "name": "Juan Pérez",
  "role": "ATHLETE",
  "totpEnabled": false
}
```

**Validaciones**:
- Email único
- Contraseña ≥ 8 caracteres
- Role válido (ATHLETE, COACH)

---

### POST /api/auth/login
Login con credenciales

**Body**:
```json
{
  "email": "athlete@example.com",
  "password": "secure_password_123",
  "totpCode": "123456"  // Opcional si 2FA habilitado
}
```

**Respuesta (200)**:
```json
{
  "session": {
    "user": { ... },
    "expires": "2026-06-13T12:00:00Z"
  }
}
```

---

### POST /api/auth/logout
Cierra sesión

**Respuesta (200)**:
```json
{ "ok": true }
```

---

### GET /api/auth/session
Obtiene sesión actual

**Respuesta (200)**:
```json
{
  "user": {
    "id": "user-123",
    "email": "athlete@example.com",
    "role": "ATHLETE"
  },
  "expires": "2026-06-13T12:00:00Z"
}
```

---

### POST /api/auth/totp/setup
Coach/Athlete inicia configuración de 2FA (TOTP)

**Respuesta (200)**:
```json
{
  "secret": "JBSWY3DPEBLW64TMMQ",
  "qrCode": "data:image/png;base64,..."
}
```

**Instrucciones**:
1. Usuario escanea QR con Google Authenticator/Authy
2. Verifica el código con endpoint siguiente

---

### POST /api/auth/totp/verify
Verifica y activa 2FA

**Body**:
```json
{
  "code": "123456"  // Código de 6 dígitos de la app
}
```

**Respuesta (200)**:
```json
{
  "backupCodes": [
    "BACKUP-CODE-1",
    "BACKUP-CODE-2",
    "..."
  ]
}
```

---

### POST /api/auth/totp/disable
Desactiva 2FA

**Body**:
```json
{
  "password": "current_password"
}
```

**Respuesta (200)**:
```json
{ "ok": true }
```

---

## 🔄 Flujos de Autenticación

### Flujo 1: Registro de Atleta

```
1. Atleta entra a /register
   → Llena email, password, nombre

2. POST /api/auth/register
   → Validar email único
   → Hash password
   → Crear User con role="ATHLETE"
   → Crear Athlete profile

3. ✓ Atleta puede loguear

4. Espera invitación del coach
   → Coach envía invite token por email
   → Atleta acepta → se une a Team
```

### Flujo 2: Registro de Coach

```
1. Coach entra a /register
   → Selecciona role="COACH"

2. POST /api/auth/register
   → Crear User con role="COACH"
   → Crear Coach profile

3. Coach crea su equipo
   → POST /api/teams
   → Se asigna como TeamUserMembership.ADMIN

4. Coach puede:
   - Crear planes
   - Invitar atletas
   - Suscribirse a APP
```

### Flujo 3: Login con 2FA

```
1. Usuario entra email y password
   → POST /api/auth/login (sin totpCode)

2. Server verifica password
   → Si User.totpEnabled:
      - Retorna status 202 (Accepted)
      - Pide código TOTP

3. Usuario ingresa código de autenticador
   → POST /api/auth/login (con totpCode)

4. Server verifica código
   → ✓ Login exitoso → Session creada
```

---

## 🛡️ Middleware de Seguridad

### 1. Authentication Middleware

Verifica que usuario esté autenticado:

```typescript
import { auth } from "@/auth"

export async function middleware(request) {
  const session = await auth()
  
  if (!session) {
    return Response.redirect(new URL('/login', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/api/teams/:path*', '/api/athletes/:path*']
}
```

---

### 2. RBAC Middleware (Coach Admin)

Verifica que usuario sea COACH_ADMIN en equipo:

```typescript
export async function validateCoachAdmin(req, teamId) {
  const session = await auth()
  if (!session) return { error: 'Unauthorized', status: 401 }
  
  const membership = await prisma.teamUserMembership.findUnique({
    where: { teamId_userId: { teamId, userId: session.user.id } }
  })
  
  if (!membership || membership.role !== 'ADMIN') {
    return { error: 'Forbidden: Require COACH_ADMIN', status: 403 }
  }
  
  return { ok: true }
}
```

---

### 3. Ownership Validation

Verifica que recurso pertenece al usuario:

```typescript
export async function validateOwnership(userId, athleteId) {
  const athlete = await prisma.athlete.findUnique({
    where: { id: athleteId }
  })
  
  if (athlete?.userId !== userId && athlete?.coachId !== userId) {
    return false  // No eres dueño ni coach
  }
  
  return true
}
```

---

## 📊 Matriz de Permisos

### Por Rol Global (User.role)

| Operación | COACH | ATHLETE | ADMIN |
|-----------|-------|---------|-------|
| Registrar usuario | ✓ | ✓ | ✓ |
| Ver su perfil | ✓ | ✓ | ✓ |
| Crear equipo | ✓ | | ✓ |
| Crear plan | ✓ | | ✓ |
| Suscribirse a APP | ✓ | | ✓ |
| Ver dashboard coach | ✓ | | ✓ |
| Registrar sesión | | ✓ | ✓ |
| Ver sus planes | | ✓ | ✓ |
| Ver otros usuarios | | | ✓ |
| Ver auditoría | | | ✓ |

---

### Por Rol en Equipo (TeamUserMembership.role)

| Operación | ADMIN | MEMBER |
|-----------|-------|--------|
| Crear plan | ✓ | ✓ (propios) |
| Invitar atletas | ✓ | |
| Asignar a plan | ✓ | |
| Ver facturas | ✓ | |
| Ver dashboard | ✓ | |
| Editar equipo | ✓ | |
| Ver atletas del equipo | ✓ | ✓ (propios) |

---

## 🔐 Validaciones de Seguridad

| Validación | Ubicación | Error |
|-----------|-----------|-------|
| Verificar sesión válida | Todos los endpoints privados | 401 Unauthorized |
| Verificar COACH_ADMIN | /api/teams/[teamId]/... | 403 Forbidden |
| Verificar ownership | GET /api/athletes/[id]/... | 403 Forbidden |
| Rate limiting (login) | POST /api/auth/login | 429 Too Many Requests |
| CSRF protection | Middleware global | 403 Forbidden |
| XSS prevention | Sanitización de input | 400 Bad Request |

---

## 📝 Notas de Implementación

- **Password**: Hasheado con bcrypt (salt rounds: 12)
- **Sessions**: JWT, válidas por 30 días
- **2FA**: TOTP (Time-based One-Time Password) via Google Authenticator/Authy
- **Backup codes**: 8 códigos, cada uno de uso único
- **Email verification**: Opcional (implementar en fase 2)
- **OAuth**: Soportado via @auth/prisma-adapter (Google, GitHub)
- **Zona horaria**: Europe/Madrid para timestamps
- **Session storage**: Database (NextAuth v5 + Prisma adapter)

---

## 🎯 Checklist de Seguridad

- [x] Contraseña hasheada (bcrypt)
- [x] Sessions en DB (no en client)
- [x] CSRF protection
- [x] XSS prevention
- [x] SQL injection prevention (Prisma)
- [x] Rate limiting (OPT)
- [x] RBAC (dos niveles)
- [x] Ownership validation
- [x] 2FA/TOTP disponible
- [x] Audit logging
- [ ] Email verification
- [ ] OAuth refresh tokens
- [ ] Session rotation

---

## 🔌 Casos de Uso Comunes

| Caso | Endpoint | Método |
|------|----------|--------|
| Registrar | POST /api/auth/register | POST |
| Login | POST /api/auth/login | POST |
| Logout | POST /api/auth/logout | POST |
| Ver sesión | GET /api/auth/session | GET |
| Activar 2FA | POST /api/auth/totp/setup | POST |
| Verificar 2FA | POST /api/auth/totp/verify | POST |
| Desactivar 2FA | POST /api/auth/totp/disable | POST |

---

## 🔗 Integración con Otros Módulos

- **Billing**: Requiere `session.user.id` para crear CoachSubscription
- **Teams**: Requiere `TeamUserMembership.role === ADMIN`
- **Athlete**: Requiere ownership o coach relationship
- **Plans**: Requiere `User.role === COACH` o `ADMIN`
- **Audit**: Registra `createdByUserId` en operaciones críticas

---

## 📚 Referencias

- NextAuth.js v5: https://authjs.dev
- Prisma Adapter: https://authjs.dev/prisma-adapter
- JWT: https://jwt.io
- TOTP/2FA: https://tools.ietf.org/html/rfc6238
