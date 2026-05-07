import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { Role } from "@prisma/client";

const registerSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  name: z.string().max(100).optional(),
  role: z.enum(["ATHLETE", "COACH"]).optional().default("ATHLETE"),
});

const TOKEN_TTL_HOURS = 24;

export async function POST(request: Request) {
  const raw = await request.json();
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const { email, password, name, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email ya registrado" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const userRole: Role = role === "COACH" ? Role.COACH : Role.ATHLETE;

  const user = await prisma.user.create({
    data: { email, name: name ?? email, passwordHash, role: userRole },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  // Auto-send verification email
  try {
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);

    await prisma.verificationToken.create({
      data: { identifier: user.email, token, expires },
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${token}&email=${encodeURIComponent(user.email)}`;

    await sendEmail({
      to: user.email,
      subject: "Verifica tu email — Apex Coach OS",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#1a1a1a">Bienvenido a Apex Coach OS</h2>
          <p style="color:#555">Tu cuenta está lista. Haz clic en el enlace para verificar tu email. El enlace expira en ${TOKEN_TTL_HOURS} horas.</p>
          <a href="${verifyUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#6366f1;color:#fff;border-radius:9999px;text-decoration:none;font-weight:600">
            Verificar email
          </a>
          <p style="color:#aaa;font-size:12px">Si no solicitaste esto, ignora este mensaje.</p>
        </div>
      `,
    });
    console.log(`[register] Verification email sent to ${user.email}`);
  } catch (err) {
    console.error(`[register] Failed to send verification email:`, err);
    // Don't fail registration, just log the error
  }

  return NextResponse.json(user, { status: 201 });
}
