import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { totpEnabled: true } });
    return NextResponse.json({ totpEnabled: user?.totpEnabled ?? false });
  } catch (err) {
    console.error("[api/2fa/status]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
