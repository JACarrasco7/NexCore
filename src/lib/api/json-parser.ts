import { NextResponse } from "next/server";

/**
 * Safely parse JSON from request body.
 * Returns parsed object or null if parsing fails.
 * Logs error for debugging.
 */
export async function parseJsonSafe<T = unknown>(
  request: Request
): Promise<T | null> {
  try {
    return await request.json() as T;
  } catch (error) {
    console.error("[parseJsonSafe] JSON parse error:", error);
    return null;
  }
}

/**
 * Parse JSON or return error response.
 * Returns discriminated union for proper TypeScript narrowing.
 */
export async function parseJsonOrError<T = unknown>(
  request: Request
): Promise<
  | { ok: true; data: T }
  | { ok: false; error: NextResponse }
> {
  try {
    const data = await request.json() as T;
    return { ok: true, data };
  } catch (error) {
    console.error("[parseJsonOrError] JSON parse error:", error);
    return {
      ok: false,
      error: NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      ),
    };
  }
}
