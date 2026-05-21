/**
 * Error de lógica de negocio.
 * Debe usarse en services y domain-rules.
 * apiHandler lo convierte a NextResponse 400/409/etc.
 */
export class BusinessError extends Error {
  constructor(
    message: string,
    public code: string = 'BUSINESS_ERROR',
    public status: number = 400,
  ) {
    super(message);
    this.name = 'BusinessError';
  }
}

/**
 * Error de API (validación, auth, not found, etc).
 * Usado para errores que ya son NextResponse listos.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number = 400,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Códigos de error estándar.
 */
export const ErrorCodes = {
  // Auth
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Validation
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',

  // Business logic
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  STATE_INVALID: 'STATE_INVALID',

  // Team/tenant
  TEAM_NOT_FOUND: 'TEAM_NOT_FOUND',
  NO_TEAM_MEMBERSHIP: 'NO_TEAM_MEMBERSHIP',
  INSUFFICIENT_PERMISSION: 'INSUFFICIENT_PERMISSION',
  ONLY_ONE_ADMIN_REQUIRED: 'ONLY_ONE_ADMIN_REQUIRED',

  // Resources
  ATHLETE_NOT_FOUND: 'ATHLETE_NOT_FOUND',
  PLAN_NOT_FOUND: 'PLAN_NOT_FOUND',
  PLAN_LOCKED: 'PLAN_LOCKED',
  PLAN_VERSION_MISMATCH: 'PLAN_VERSION_MISMATCH',

  // Rate limit
  RATE_LIMITED: 'RATE_LIMITED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',

  // Internal
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;

/**
 * Helper para crear BusinessError rápidamente.
 */
export function throw404(entity: string): never {
  throw new BusinessError(`${entity} no encontrado`, ErrorCodes.NOT_FOUND, 404);
}

export function throwConflict(message: string): never {
  throw new BusinessError(message, ErrorCodes.CONFLICT, 409);
}

export function throwForbidden(message: string = 'No tienes permiso'): never {
  throw new BusinessError(message, ErrorCodes.FORBIDDEN, 403);
}

export function throwInvalidState(message: string): never {
  throw new BusinessError(message, ErrorCodes.STATE_INVALID, 400);
}
