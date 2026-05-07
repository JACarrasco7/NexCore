import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const coach = await prisma.coach.findUnique({ where: { userId: session.user.id } });
  if (!coach) return NextResponse.json({ error: "Not a coach" }, { status: 403 });

  const { id } = await params;

  const template = await prisma.nutritionTemplate.findUnique({ where: { id } });
  if (!template || template.coachId !== coach.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.nutritionTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
