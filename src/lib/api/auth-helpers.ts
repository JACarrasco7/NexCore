import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AuthError, ForbiddenError } from "./errors";

type Session = { userId: string; role: string };

export async function requireSession(): Promise<Session> {
  const session = await auth();
  if (!session?.user?.id) throw new AuthError();
  return {
    userId: session.user.id,
    role: (session.user as { role?: string }).role ?? "ATHLETE",
  };
}

export async function requireRole(roles: string | string[]): Promise<Session> {
  const session = await requireSession();
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(session.role)) throw new ForbiddenError("Insufficient permissions");
  return session;
}

/**
 * Centralised rule:
 * - ADMIN → always
 * - ATHLETE → only their own athlete record (athlete.userId === userId)
 * - COACH → only athletes whose coachId links back to the session's coach
 *
 * write=true → athlete cannot perform the action (coach/admin only)
 */
export async function assertAthleteAccess(
  athleteId: string,
  opts: { write?: boolean } = {}
): Promise<Session> {
  const session = await requireSession();
  if (session.role === "ADMIN") return session;

  const athlete = await prisma.athlete.findUnique({
    where: { id: athleteId },
    select: {
      userId: true,
      teamId: true,
      coach: { select: { userId: true } },
      team: {
        select: {
          userMemberships: {
            where: { isActive: true },
            select: { userId: true },
          },
        },
      },
    },
  });

  if (!athlete) throw new ForbiddenError();

  if (session.role === "ATHLETE") {
    if (opts.write) throw new ForbiddenError("Athletes cannot perform this action");
    if (athlete.userId !== session.userId) throw new ForbiddenError();
    return session;
  }

  if (session.role === "COACH") {
    // New model: team ownership. Backward compatible fallback to legacy coachId.
    if (athlete.teamId) {
      const isMember = athlete.team?.userMemberships.some((m) => m.userId === session.userId) ?? false;
      if (!isMember) throw new ForbiddenError();
      return session;
    }
    if (athlete.coach?.userId !== session.userId) throw new ForbiddenError();
    return session;
  }

  throw new ForbiddenError();
}

/**
 * Coach-only ownership check. Throws if the current user is not the coach
 * of the specified athlete.
 */
export async function assertCoachOwnsAthlete(athleteId: string): Promise<Session> {
  const session = await requireSession();
  if (session.role === "ADMIN") return session;
  if (session.role !== "COACH") throw new ForbiddenError("Coach access required");

  const athlete = await prisma.athlete.findUnique({
    where: { id: athleteId },
    select: {
      teamId: true,
      coach: { select: { userId: true } },
      team: {
        select: {
          userMemberships: {
            where: { isActive: true },
            select: { userId: true },
          },
        },
      },
    },
  });

  if (!athlete) throw new ForbiddenError();
  if (athlete.teamId) {
    const isMember = athlete.team?.userMemberships.some((m) => m.userId === session.userId) ?? false;
    if (!isMember) throw new ForbiddenError();
    return session;
  }

  if (!athlete.coach || athlete.coach.userId !== session.userId) throw new ForbiddenError();
  return session;
}

/**
 * Resolve the Coach record id for the current session user.
 * Throws if the session is not a coach.
 */
export async function requireCoachId(): Promise<string> {
  const session = await requireRole(["COACH", "ADMIN"]);
  const coach = await prisma.coach.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });
  if (!coach) throw new ForbiddenError("Coach profile not found");
  return coach.id;
}

/**
 * Resolve the Athlete record id for the current session user.
 * Throws if the session is not an athlete.
 */
export async function requireAthleteId(): Promise<string> {
  const session = await requireRole("ATHLETE");
  const athlete = await prisma.athlete.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });
  if (!athlete) throw new ForbiddenError("Athlete profile not found");
  return athlete.id;
}

/**
 * Returns the first active teamId for any authenticated user.
 * Athletes, coaches, and admins all use TeamUserMembership.
 */
export async function resolveTeamId(userId: string): Promise<string | null> {
  const m = await prisma.teamUserMembership.findFirst({
    where: { userId, isActive: true },
    select: { teamId: true },
    orderBy: { createdAt: "asc" },
  });
  return m?.teamId ?? null;
}

/**
 * Returns the first active teamId where the user has ADMIN role.
 * Used for catalog management endpoints (goals/phases CRUD).
 */
export async function resolveAdminTeamId(userId: string): Promise<string | null> {
  const m = await prisma.teamUserMembership.findFirst({
    where: { userId, isActive: true, role: "ADMIN" },
    select: { teamId: true },
    orderBy: { createdAt: "asc" },
  });
  return m?.teamId ?? null;
}

// ─── Multi-tenant guards ─────────────────────────────────────────────────────

/**
 * Asserts the session user has an active membership in the given team.
 * Returns membership info (role + isActive). Throws ForbiddenError otherwise.
 *
 * Use this in any tenant-scoped endpoint where teamId comes from the URL/body
 * to prevent cross-tenant access (IDOR).
 */
export async function requireTeamMembership(
  teamId: string,
  opts: { adminOnly?: boolean } = {}
): Promise<{ userId: string; role: string; teamRole: "ADMIN" | "MEMBER" }> {
  const session = await requireSession();

  // Platform admin bypass
  if (session.role === "ADMIN") {
    return { userId: session.userId, role: session.role, teamRole: "ADMIN" };
  }

  const membership = await prisma.teamUserMembership.findUnique({
    where: { teamId_userId: { teamId, userId: session.userId } },
    select: { role: true, isActive: true },
  });

  if (!membership || !membership.isActive) {
    throw new ForbiddenError("No tienes acceso a este equipo");
  }

  if (opts.adminOnly && membership.role !== "ADMIN") {
    throw new ForbiddenError("Se requiere rol ADMIN del equipo");
  }

  return {
    userId: session.userId,
    role: session.role,
    teamRole: membership.role as "ADMIN" | "MEMBER",
  };
}

/**
 * Resolves the active teamId for the current session, with role context.
 * Returns null if user has no team membership.
 */
export async function resolveCurrentTeam(): Promise<{
  userId: string;
  teamId: string | null;
  teamRole: "ADMIN" | "MEMBER" | null;
} | null> {
  const session = await requireSession();
  const m = await prisma.teamUserMembership.findFirst({
    where: { userId: session.userId, isActive: true },
    select: { teamId: true, role: true },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }], // ADMIN before MEMBER
  });
  return {
    userId: session.userId,
    teamId: m?.teamId ?? null,
    teamRole: (m?.role as "ADMIN" | "MEMBER") ?? null,
  };
}
