import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { checkRateLimit, getClientIp, getRateLimitKey, LIMITS } from "@/lib/rate-limit";

/**
 * Global API middleware.
 * Rejects unauthenticated requests to /api/* before they reach route handlers.
 * Applies rate limiting to auth/register endpoints.
 * Cron routes are excluded (they use Bearer token auth internally).
 */

const PUBLIC_PREFIXES = [
  "/api/auth",
  "/api/register",
  "/api/2fa",
  "/api/wger",
  "/api/webhooks",
];

const RATE_LIMITED_ROUTES = [
  { pattern: /^\/api\/auth/, limits: LIMITS.AUTH },
  { pattern: /^\/api\/register/, limits: LIMITS.REGISTER },
];

const PAGE_REDIRECTS = [
  "/login",
  "/register",
  "/",
];

const BEARER_PREFIXES = [
  "/api/cron",
];

export default async function middleware(req: Request) {
  const { pathname } = (req as any).nextUrl;
  const clientIp = getClientIp((req as any).headers);

  // Resolve token via next-auth/jwt (edge-safe)
  let token: any = null;
  try {
    token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET });
  } catch (e) {
    // ignore token parse errors
    token = null;
  }

  const userId = token?.id as string | undefined;

  // Rate limit public auth/register routes
  if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/register")) {
    const routeMatch = RATE_LIMITED_ROUTES.find((r) => r.pattern.test(pathname));
    if (routeMatch) {
      const key = getRateLimitKey(clientIp, userId);
      const { ok, remaining, resetAt } = await checkRateLimit(
        key,
        routeMatch.limits.maxRequests,
        routeMatch.limits.windowSeconds
      );
      if (!ok) {
        return NextResponse.json(
          { error: "Too many requests. Try again later." },
          {
            status: 429,
            headers: {
              "Retry-After": Math.ceil((resetAt - Date.now()) / 1000).toString(),
            },
          }
        );
      }
      // Add remaining to response headers for client awareness
      const res = NextResponse.next();
      res.headers.set("X-RateLimit-Remaining", remaining.toString());
      return res;
    }
  }

  // Allow public routes
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow page redirects (login, register, etc.)
  if (PAGE_REDIRECTS.some((p) => pathname === p)) {
    return NextResponse.next();
  }

  // Allow cron routes (Bearer-gated inside the route)
  if (BEARER_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // If user has TOTP enabled but not yet verified, block API access and
  // redirect page requests to the login flow so they can complete 2FA.
  const user = token ? { totpEnabled: Boolean(token.totpEnabled), totpVerified: Boolean(token.totpVerified) } : undefined;
  if (user?.totpEnabled && !user?.totpVerified) {
    // 2FA endpoints and auth are allowed above via PUBLIC_PREFIXES
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: { code: "TOTP_REQUIRED", message: "Two-factor authentication required" } },
        { status: 403 }
      );
    }

    // For page requests, redirect to `/login?totp_required=1`
    const url = (req as any).nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("totp_required", "1");
    return NextResponse.redirect(url);
  }

  // Para rutas /api/*, requerir sesión
  if (pathname.startsWith("/api/")) {
    if (!token) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    // match pages but exclude Next.js internals and common static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
