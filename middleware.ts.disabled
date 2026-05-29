import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

const PUBLIC_PREFIXES = ['/api/auth', '/api/register', '/api/2fa', '/api/wger', '/api/webhooks']
const BEARER_PREFIXES = ['/api/cron']

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public routes
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Allow cron routes
  if (BEARER_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Allow login/register pages
  if (pathname === '/login' || pathname === '/register' || pathname === '/') {
    return NextResponse.next()
  }

  // Get token for authenticated routes
  let token = null
  try {
    token = await getToken({ req, secret: process.env.AUTH_SECRET })
  } catch {
    // Token parse error — treat as unauthenticated
  }

  // Require authentication for API routes
  if (pathname.startsWith('/api/')) {
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
