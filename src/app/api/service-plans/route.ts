import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role: string }).role;

  if (role !== "COACH" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const coach = await prisma.coach.findFirst({ where: { userId } });
  if (!coach) return NextResponse.json({ error: "Coach not found" }, { status: 404 });

  const plans = await prisma.servicePlan.findMany({
    where: { coachId: coach.id },
    include: { _count: { select: { athletes: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(plans);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role: string }).role;
  if (role !== "COACH" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = (session.user as { id: string }).id;
  const coach = await prisma.coach.findFirst({ where: { userId } });
  if (!coach) return NextResponse.json({ error: "Coach not found" }, { status: 404 });

  const body = await req.json() as {
    name: string;
    description?: string;
    priceEur?: number;
    durationWeeks?: number;
    includesNutrition?: boolean;
    checkinFreqDays?: number;
  };

  const plan = await prisma.servicePlan.create({
    data: {
      coachId: coach.id,
      name: body.name,
      description: body.description,
      priceEur: body.priceEur ?? 0,
      durationWeeks: body.durationWeeks ?? 4,
      includesNutrition: body.includesNutrition ?? false,
      checkinFreqDays: body.checkinFreqDays ?? 7,
    },
  });

  return NextResponse.json(plan, { status: 201 });
}
