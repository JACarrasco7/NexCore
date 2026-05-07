import { auth } from "@/auth";
import { NextResponse } from "next/server";

const PUBLIC_API_PATTERNS = [
  /^\/api\/auth\//,
  /^\/api\/register$/,
  /^\/api\/cron\//,
  /^\/api\/wger\//,
];

export default auth(function proxy(req) {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // ── API routes: return 401 JSON instead of redirecting ──
  if (pathname.startsWith("/api/")) {
    if (PUBLIC_API_PATTERNS.some((re) => re.test(pathname))) {
      return NextResponse.next();
    }
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const res = NextResponse.next();
    res.headers.set("x-user-id", session.user.id ?? "");
    res.headers.set("x-user-role", (session.user as { role?: string }).role ?? "");
    return res;
  }

  // ── Page routes ──
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = (session.user as { role?: string }).role;

  if (pathname.startsWith("/coach") && role !== "COACH" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/athlete/check-in", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
