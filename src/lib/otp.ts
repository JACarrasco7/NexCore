/**
 * OTP (One-Time Password) service for authentication and signatures.
 * Handles generation, validation, expiration, and retry logic.
 */

import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";
import { OtpType } from "@prisma/client";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 3;
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Generate a new OTP for a user.
 * Invalidates previous unexpired OTPs of the same type.
 */
export async function generateOtp(
  userId: string,
  type: OtpType,
  contactMethod?: { type: "email"; value: string } | { type: "sms"; value: string }
): Promise<{
  code: string; // Last digit visible only
  expiresAt: Date;
  attemptsLeft: number;
  hint: string;
}> {
  // Delete previous OTPs for this user+type
  await prisma.otpToken.deleteMany({
    where: { userId, type },
  });

  // Generate random 6-digit code using crypto RNG
  const code = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Store OTP
  const token = await prisma.otpToken.create({
    data: {
      userId,
      code,
      type,
      expiresAt,
      attemptsLeft: MAX_ATTEMPTS,
    },
  });

  // Send OTP via email or SMS if contact method provided
  if (contactMethod) {
    try {
      if (contactMethod.type === "email") {
        await sendEmail({
          to: contactMethod.value,
          subject: `Tu código de verificación: ${code}`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
              <h2 style="color:#1a1a1a">Código de verificación</h2>
              <p style="font-size:14px;color:#555">Tu código temporal es:</p>
              <div style="background:#f5f5f5;padding:20px;border-radius:8px;text-align:center;margin:16px 0">
                <code style="font-size:28px;letter-spacing:4px;font-weight:bold;color:#6366f1">${code}</code>
              </div>
              <p style="font-size:12px;color:#aaa">Este código expira en ${OTP_EXPIRY_MINUTES} minutos. No lo compartas con nadie.</p>
            </div>
          `,
        });
      } else if (contactMethod.type === "sms") {
        await sendSms({
          to: contactMethod.value,
          message: `Tu código de Apex Coach OS es: ${code}. Válido por ${OTP_EXPIRY_MINUTES} minutos.`,
        });
      }
    } catch (err) {
      console.error(`[OTP] Failed to send via ${contactMethod.type}:`, err);
      // Don't fail OTP generation if delivery fails
    }
  }

  // Audit log
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action: "otp_generated",
        entity: "OtpToken",
        entityId: token.id,
        ipAddress: undefined, // Would come from request context
      },
    });
  } catch (err) {
    console.error("[OTP] Failed to create audit log:", err);
  }

  // Mask code for response (show only last digit)
  const maskedCode = "•".repeat(OTP_LENGTH - 1) + code.slice(-1);

  return {
    code: maskedCode,
    expiresAt: token.expiresAt,
    attemptsLeft: token.attemptsLeft,
    hint: `Código enviado a ${contactMethod?.value ?? "tu email"}. Válido ${OTP_EXPIRY_MINUTES} min.`,
  };
}

/**
 * Validate an OTP code.
 * Checks expiration, attempts, and deletes on success.
 */
export async function validateOtp(
  userId: string,
  code: string,
  type: OtpType
): Promise<{
  valid: boolean;
  attemptsLeft: number;
  error?: string;
}> {
  const token = await prisma.otpToken.findFirst({
    where: { userId, type, code },
  });

  if (!token) {
    // OTP not found or incorrect
    const existing = await prisma.otpToken.findFirst({
      where: { userId, type },
    });

    if (existing) {
      // Decrement attempts
      if (existing.attemptsLeft <= 1) {
        // Delete after last failed attempt
        await prisma.otpToken.delete({ where: { id: existing.id } });

        // Audit log
        try {
          await prisma.auditLog.create({
            data: {
              userId,
              action: "otp_failed_max_attempts",
              entity: "OtpToken",
              entityId: existing.id,
            },
          });
        } catch (err) {
          console.error("[OTP] Failed to create audit log:", err);
        }

        return {
          valid: false,
          attemptsLeft: 0,
          error: "Demasiados intentos fallidos. Solicita un nuevo código.",
        };
      } else {
        // Decrement and update
        await prisma.otpToken.update({
          where: { id: existing.id },
          data: { attemptsLeft: existing.attemptsLeft - 1 },
        });

        // Audit log
        try {
          await prisma.auditLog.create({
            data: {
              userId,
              action: "otp_failed_attempt",
              entity: "OtpToken",
              entityId: existing.id,
              diff: { attemptsLeft: existing.attemptsLeft - 1 },
            },
          });
        } catch (err) {
          console.error("[OTP] Failed to create audit log:", err);
        }

        return {
          valid: false,
          attemptsLeft: existing.attemptsLeft - 1,
          error: "Código incorrecto",
        };
      }
    }

    return {
      valid: false,
      attemptsLeft: 0,
      error: "Código no encontrado o expirado",
    };
  }

  // Check expiration
  if (new Date() > token.expiresAt) {
    await prisma.otpToken.delete({ where: { id: token.id } });

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: "otp_expired",
          entity: "OtpToken",
          entityId: token.id,
        },
      });
    } catch (err) {
      console.error("[OTP] Failed to create audit log:", err);
    }

    return {
      valid: false,
      attemptsLeft: 0,
      error: "Código expirado",
    };
  }

  // OTP valid! Delete it and log success
  await prisma.otpToken.delete({ where: { id: token.id } });

  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action: "otp_verified",
        entity: "OtpToken",
        entityId: token.id,
      },
    });
  } catch (err) {
    console.error("[OTP] Failed to create audit log:", err);
  }

  return {
    valid: true,
    attemptsLeft: MAX_ATTEMPTS,
  };
}

/**
 * Resend OTP with cooldown protection.
 */
export async function resendOtp(
  userId: string,
  type: OtpType,
  contactMethod?: { type: "email"; value: string } | { type: "sms"; value: string }
): Promise<{
  ok: boolean;
  cooldownSeconds?: number;
  error?: string;
}> {
  const existing = await prisma.otpToken.findFirst({
    where: { userId, type },
  });

  if (existing) {
    const elapsed = (Date.now() - existing.createdAt.getTime()) / 1000;
    if (elapsed < RESEND_COOLDOWN_SECONDS) {
      return {
        ok: false,
        cooldownSeconds: Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed),
        error: "Espera antes de pedir otro código",
      };
    }

    // Delete old OTP
    await prisma.otpToken.delete({ where: { id: existing.id } });
  }

  // Generate new OTP
  const result = await generateOtp(userId, type, contactMethod);
  return { ok: true };
}

/**
 * Cleanup expired OTPs (should be run periodically, e.g., via cron).
 */
export async function cleanupExpiredOtps(): Promise<number> {
  const result = await prisma.otpToken.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });

  return result.count;
}
