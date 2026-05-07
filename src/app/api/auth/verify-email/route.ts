import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/auth/verify-email?token=...&email=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  if (!token || !email) {
    return NextResponse.redirect(new URL("/auth/verify-error?reason=missing", req.url));
  }

  const record = await prisma.verificationToken.findFirst({
    where: { token, identifier: email },
  });

  if (!record) {
    return NextResponse.redirect(new URL("/auth/verify-error?reason=invalid", req.url));
  }

  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token } });
    return NextResponse.redirect(new URL("/auth/verify-error?reason=expired", req.url));
  }

  // Marcar email como verificado
  await prisma.user.update({
    where: { email },
    data: { emailVerified: new Date() },
  });

  await prisma.verificationToken.delete({ where: { token } });

  return NextResponse.redirect(new URL("/auth/verify-success", req.url));
}
