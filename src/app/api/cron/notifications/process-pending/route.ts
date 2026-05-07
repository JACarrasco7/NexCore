import { NextRequest, NextResponse } from "next/server";
import { processPendingNotificationDeliveries } from "@/lib/notification-queue";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await processPendingNotificationDeliveries();
    return NextResponse.json({ ok: true, processed: result.length, deliveries: result });
  } catch (error) {
    console.error("[cron/process-pending]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
