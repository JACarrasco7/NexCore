import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ hasProfile: false, role: null });
  }

  const role = (session.user as { role?: string }).role;

  if (role === "COACH") {
    const coach = await prisma.coach.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    return NextResponse.json({ hasProfile: !!coach, role: "COACH" });
  }

  if (role === "ATHLETE") {
    const athlete = await prisma.athlete.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    return NextResponse.json({ hasProfile: !!athlete, role: "ATHLETE" });
  }

  return NextResponse.json({ hasProfile: false, role });
}
