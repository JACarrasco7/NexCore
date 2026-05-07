# Auth y Roles

## Stack
- **NextAuth.js v5** (beta.28) con `--legacy-peer-deps` (peer conflict con Next.js 16)
- **Prisma adapter** (`@auth/prisma-adapter`)
- **bcryptjs** para hashing de contraseñas (12 salt rounds)

## Roles
```prisma
enum Role {
  COACH
  ATHLETE
  ADMIN
}
```

## Modelos de BD (NextAuth)
- `User` — id, email, passwordHash, role, name
- `Account` — OAuth providers (preparado, no activo)
- `Session` — sesiones JWT (strategy: "jwt")
- `VerificationToken` — para email verification (preparado)

## Archivos clave
- `src/auth.ts` — config NextAuth: Credentials provider, callbacks jwt/session
- `src/app/api/auth/[...nextauth]/route.ts` — handlers GET/POST
- `src/app/api/register/route.ts` — registro de usuario con hashing
- `src/proxy.ts` — proxy (middleware Next.js 16) con protección por rol
- `src/app/login/page.tsx` — formulario de login
- `src/app/register/page.tsx` — formulario de registro

## Flujo de auth
1. Usuario va a `/login` → envía credentials
2. NextAuth valida con `authorize()` → bcrypt.compare
3. JWT con `{ id, email, role }` almacenado en cookie
4. Proxy intercepta rutas `/coach/*` → si role ≠ COACH redirige a `/athlete/check-in`
5. Rutas públicas: `/`, `/login`, `/register`, `/api/auth/*`, `/api/register`

## Pendiente
- Usar `auth()` (session) en páginas para filtrar datos por coach autenticado
- Ruta `/coach/settings` para perfil del coach
- Email verification (VerificationToken ya está en el schema)
