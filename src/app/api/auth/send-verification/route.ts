import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api/auth-helpers";
import { sendEmail } from "@/lib/email";
import { AuthError } from "@/lib/api/errors";

const TOKEN_TTL_HOURS = 24;

// POST /api/auth/send-verification — enviar (o reenviar) email de verificación
export async function POST(_req: NextRequest) {
  try {
    const session = await requireSession();

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true, emailVerified: true },
    });

    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    if (user.emailVerified) {
      return NextResponse.json({ message: "Email ya verificado" });
    }

    // Borrar tokens anteriores para este usuario
    await prisma.verificationToken.deleteMany({
      where: { identifier: user.email },
    });

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
          <h2 style="color:#1a1a1a">Verifica tu dirección de email</h2>
          <p style="color:#555">Haz clic en el enlace para verificar tu cuenta. El enlace expira en ${TOKEN_TTL_HOURS} horas.</p>
          <a href="${verifyUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#6366f1;color:#fff;border-radius:9999px;text-decoration:none;font-weight:600">
            Verificar email
          </a>
          <p style="color:#aaa;font-size:12px">Si no solicitaste esto, ignora este mensaje.</p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: (e as Error).message }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
