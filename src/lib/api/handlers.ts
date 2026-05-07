import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError, ForbiddenError, ValidationError, NotFoundError } from "./errors";

type ApiHandler<T = unknown> = (req: NextRequest, ctx?: { params: Record<string, string> }) => Promise<NextResponse<T>>;

export function withApiHandler<T = unknown>(handler: ApiHandler<T>): ApiHandler<T> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof AuthError) {
        return NextResponse.json(
          { error: { code: err.code, message: err.message } },
          { status: 401 }
        ) as NextResponse<T>;
      }
      if (err instanceof ForbiddenError) {
        return NextResponse.json(
          { error: { code: err.code, message: err.message } },
          { status: 403 }
        ) as NextResponse<T>;
      }
      if (err instanceof NotFoundError) {
        return NextResponse.json(
          { error: { code: err.code, message: err.message } },
          { status: 404 }
        ) as NextResponse<T>;
      }
      if (err instanceof ValidationError) {
        return NextResponse.json(
          { error: { code: err.code, message: err.message, details: err.details } },
          { status: 400 }
        ) as NextResponse<T>;
      }
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "Invalid input", details: err.issues } },
          { status: 400 }
        ) as NextResponse<T>;
      }
      console.error("[API Error]", err);
      return NextResponse.json(
        { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
        { status: 500 }
      ) as NextResponse<T>;
    }
  };
}
