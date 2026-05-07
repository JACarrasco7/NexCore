/**
 * POST /api/auth/otp/validate
 * Validate OTP code and prepare for next step (login or signature).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateOtp } from "@/lib/otp";
import { prisma } from "@/lib/prisma";
import { OtpType } from "@prisma/client";

const validateSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/, "Código debe ser 6 dígitos"),
  type: z.enum(["LOGIN", "SIGNATURE", "RESET"]).default("LOGIN"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = validateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const { email, code, type } = parsed.data;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Validate OTP
    const result = await validateOtp(user.id, code, type as OtpType);

    if (!result.valid) {
      return NextResponse.json(
        {
          valid: false,
          attemptsLeft: result.attemptsLeft,
          error: result.error,
        },
        { status: 400 }
      );
    }

    // OTP is valid! Prepare response based on type
    let nextStep = "";

    switch (type) {
      case "LOGIN":
        // User can now proceed to create session
        nextStep = "proceed-to-login";
        break;
      case "SIGNATURE":
        // User can now proceed to sign document
        nextStep = "proceed-to-signature";
        break;
      case "RESET":
        // User can now reset password
        nextStep = "proceed-to-reset";
        break;
    }

    return NextResponse.json({
      valid: true,
      nextStep,
      userId: user.id,
      email: user.email,
      role: user.role,
      message: "Código verificado correctamente",
    });
  } catch (err) {
    console.error("[auth/otp/validate]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
