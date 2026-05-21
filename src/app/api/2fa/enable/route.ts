import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { verifyToken, generateBackupCodes } from "@/lib/totp";
import { prisma } from "@/lib/prisma";
import { setBackupCodesForUser } from "@/lib/backup-codes";
import { checkRateLimit, getClientIp, getRateLimitKey, LIMITS } from "@/lib/rate-limit";
import { parseJsonOrError } from "@/lib/api/json-parser";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    // rate limit
    const clientIp = getClientIp(request.headers);
    const key = getRateLimitKey(clientIp, session.user.id);
    const rl = await checkRateLimit(key, LIMITS.OTP.maxRequests, LIMITS.OTP.windowSeconds);
    if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const parseResult = await parseJsonOrError(request);
    if (!parseResult.ok) return parseResult.error;
    const body = parseResult.data as any;
    const { token } = body;
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

    // Read pending secret from DB
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { pendingTotpSecret: true, pendingTotpExpiresAt: true } });
    if (!user || !user.pendingTotpSecret) return NextResponse.json({ error: "No pending TOTP setup found" }, { status: 400 });
    if (user.pendingTotpExpiresAt && new Date() > user.pendingTotpExpiresAt) return NextResponse.json({ error: "Setup expired" }, { status: 400 });

    const ok = await verifyToken(user.pendingTotpSecret, String(token));
    if (!ok) return NextResponse.json({ error: "Código inválido" }, { status: 400 });

    // Generate backup codes
    const { plain, hashed } = await generateBackupCodes(8, 8);

    // Promote pending secret to active secret and store backup codes
    await prisma.user.update({ where: { id: session.user.id }, data: { totpSecret: user.pendingTotpSecret, totpEnabled: true, pendingTotpSecret: null, pendingTotpExpiresAt: null } });
    await setBackupCodesForUser(session.user.id, hashed);

    return NextResponse.json({ ok: true, backupCodes: plain });
  } catch (err) {
    console.error("[api/2fa/enable]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
