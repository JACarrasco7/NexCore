import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const coach = await prisma.coach.findUnique({ where: { userId: session.user.id } });
  if (!coach) return NextResponse.json({ error: "Not a coach" }, { status: 403 });

  const templates = await prisma.nutritionTemplate.findMany({
    where: { coachId: coach.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, meals: true, createdAt: true },
  });

  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const coach = await prisma.coach.findUnique({ where: { userId: session.user.id } });
  if (!coach) return NextResponse.json({ error: "Not a coach" }, { status: 403 });

  const { name, meals } = await req.json();
  if (!name || !meals) return NextResponse.json({ error: "name y meals requeridos" }, { status: 400 });

  const template = await prisma.nutritionTemplate.create({
    data: { coachId: coach.id, name, meals },
  });

  return NextResponse.json(template, { status: 201 });
}
