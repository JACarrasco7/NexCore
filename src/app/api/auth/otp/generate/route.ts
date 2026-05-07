/**
 * POST /api/auth/otp/generate
 * Generate and send OTP to user for login or signature.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateOtp } from "@/lib/otp";
import { prisma } from "@/lib/prisma";
import { OtpType } from "@prisma/client";

const generateSchema = z.object({
  email: z.string().email(),
  type: z.enum(["LOGIN", "SIGNATURE", "RESET"]).default("LOGIN"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = generateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const { email, type } = parsed.data;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!user) {
      // Don't reveal if email exists (security)
      return NextResponse.json({
        ok: true,
        hint: "Si la cuenta existe, recibirás un código por email",
      });
    }

    // Generate OTP
    const result = await generateOtp(user.id, type as OtpType, {
      type: "email",
      value: user.email,
    });

    // Extract client IP for rate limiting / audit purposes
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("cf-connecting-ip") ||
      "unknown";

    return NextResponse.json({
      ok: true,
      code: result.code,
      expiresAt: result.expiresAt,
      attemptsLeft: result.attemptsLeft,
      hint: result.hint,
    });
  } catch (err) {
    console.error("[auth/otp/generate]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
