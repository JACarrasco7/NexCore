import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCoachToday } from "@/lib/coach-today";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "COACH" && role !== "ADMIN") {
    return NextResponse.json({ error: "Solo coaches" }, { status: 403 });
  }

  const data = await getCoachToday(session.user.id);
  return NextResponse.json(data);
}
