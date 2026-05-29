import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { checkRateLimit, getClientIp, getRateLimitKey, LIMITS } from '@/lib/rate-limit'

/**
 * JWT token payload structure
 */
interface TokenPayload {
  id: string
  email: string
  name?: string
  role: string
  totpEnabled?: boolean
  totpVerified?: boolean
  totpCheckedAt?: number
  emailVerified?: boolean | null
}

/**
 * Global API middleware.
 * Rejects unauthenticated requests to /api/* before they reach route handlers.
 * Applies rate limiting to auth/register endpoints.
 * Cron routes are excluded (they use Bearer token auth internally).
 */

const PUBLIC_PREFIXES = ['/api/auth', '/api/register', '/api/2fa', '/api/wger', '/api/webhooks']

const RATE_LIMITED_ROUTES = [
  // Solo limitar los endpoints de acción, NO session/csrf/providers
  { pattern: /^\/api\/auth\/(signin|callback)/, limits: LIMITS.AUTH },
  { pattern: /^\/api\/register/, limits: LIMITS.REGISTER },
]

const PAGE_REDIRECTS = ['/login', '/register', '/']

const BEARER_PREFIXES = ['/api/cron']

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const clientIp = getClientIp(req.headers)

  // Resolve token via next-auth/jwt (edge-safe)
  let token: TokenPayload | null = null
  try {
    token = (await getToken({ req, secret: process.env.AUTH_SECRET })) as TokenPayload | null
  } catch (e) {
    // Log token parse errors for security monitoring
    // If token parsing fails, treat as unauthenticated (token = null)
    console.warn('[middleware] Token parsing failed:', {
      pathname,
      error: e instanceof Error ? e.message : String(e),
    })
    token = null
  }

  const userId = token?.id as string | undefined

  // Rate limit solo sobre endpoints de acción (signin, callback, register)
  if (
    pathname.startsWith('/api/auth/signin') ||
    pathname.startsWith('/api/auth/callback') ||
    pathname.startsWith('/api/register')
  ) {
    const routeMatch = RATE_LIMITED_ROUTES.find((r) => r.pattern.test(pathname))
    if (routeMatch) {
      const key = getRateLimitKey(clientIp, userId)
      const { ok, remaining, resetAt } = await checkRateLimit(
        key,
        routeMatch.limits.maxRequests,
        routeMatch.limits.windowSeconds
      )
      if (!ok) {
        return NextResponse.json(
          { error: 'Too many requests. Try again later.' },
          {
            status: 429,
            headers: {
              'Retry-After': Math.ceil((resetAt - Date.now()) / 1000).toString(),
            },
          }
        )
      }
      // Add remaining to response headers for client awareness
      const res = NextResponse.next()
      res.headers.set('X-RateLimit-Remaining', remaining.toString())
      return res
    }
  }

  // Allow public routes
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Allow page redirects (login, register, etc.)
  if (PAGE_REDIRECTS.some((p) => pathname === p)) {
    return NextResponse.next()
  }

  // Allow cron routes (Bearer-gated inside the route)
  if (BEARER_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // If user has TOTP enabled but not yet verified, block API access and
  // redirect page requests to the login flow so they can complete 2FA.
  const user = token
    ? { totpEnabled: Boolean(token.totpEnabled), totpVerified: Boolean(token.totpVerified) }
    : undefined
  if (user?.totpEnabled && !user?.totpVerified) {
    // 2FA endpoints and auth are allowed above via PUBLIC_PREFIXES
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: { code: 'TOTP_REQUIRED', message: 'Two-factor authentication required' } },
        { status: 403 }
      )
    }

    // For page requests, redirect to `/login?totp_required=1`
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('totp_required', '1')
    return NextResponse.redirect(url)
  }

  // Rutas que requieren verificación EMAIL (solo en registro inicial)
  // Una vez verificado en onboarding, no se valida más en middleware
  // Las validaciones de teléfono para facturación van en endpoints específicos
  const EMAIL_VERIFICATION_REQUIRED_ROUTES: { pattern: RegExp }[] = []

  // Para rutas protegidas: verificar solo que esté autenticado
  // Las validaciones específicas (phone para facturación) van en los endpoints
  const isVerificationRequired = EMAIL_VERIFICATION_REQUIRED_ROUTES.some((r) =>
    r.pattern.test(pathname)
  )
  if (isVerificationRequired && token) {
    // Lógica específica si la hubiera, pero por ahora está vacía
    // porque la verificación se maneja en onboarding, no en middleware
  }

  // Para rutas /api/*, requerir sesión
  if (pathname.startsWith('/api/')) {
    if (!token) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/:path*',
    // match pages but exclude Next.js internals and common static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
