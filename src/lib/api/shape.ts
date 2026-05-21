/**
 * Standard API response shapes.
 * All endpoints should return one of these.
 */

/**
 * Paginated list response.
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  pageSize?: number;
  page?: number;
  nextCursor?: string;
  hasMore?: boolean;
}

/**
 * Single entity response.
 */
export type SingleResponse<T> = T;

/**
 * Action response (for endpoints that don't return data).
 */
export interface ActionResponse {
  ok: true;
  message?: string;
}

/**
 * Error response.
 */
export interface ErrorResponse {
  error: string;
  code?: string;
  issues?: Array<{ path: (string | number)[]; message: string }>;
  status?: number;
}

/**
 * Create paginated response.
 */
export function okList<T>(opts: {
  items: T[];
  total: number;
  pageSize?: number;
  page?: number;
  nextCursor?: string;
  hasMore?: boolean;
}): PaginatedResponse<T> {
  return {
    items: opts.items,
    total: opts.total,
    pageSize: opts.pageSize,
    page: opts.page,
    nextCursor: opts.nextCursor,
    hasMore: opts.hasMore,
  };
}

/**
 * Create single entity response.
 */
export function okOne<T>(entity: T): T {
  return entity;
}

/**
 * Create action response.
 */
export function okAction(message?: string): ActionResponse {
  return { ok: true, message };
}

/**
 * Helper to detect if response needs to be wrapped.
 * Checks if data looks like a list wrapper with specific keys.
 */
export function unwrapIfNeeded<T>(data: unknown): T {
  if (
    typeof data === 'object' &&
    data !== null &&
    !Array.isArray(data)
  ) {
    const obj = data as Record<string, unknown>;

    // Check for common wrapper keys
    if ('items' in obj && Array.isArray(obj.items)) {
      return obj.items as T;
    }
    if ('results' in obj && Array.isArray(obj.results)) {
      return obj.results as T;
    }
    if ('athletes' in obj && Array.isArray(obj.athletes)) {
      return obj.athletes as T;
    }
    if ('plans' in obj && Array.isArray(obj.plans)) {
      return obj.plans as T;
    }
    if ('data' in obj && Array.isArray(obj.data)) {
      return obj.data as T;
    }
  }

  return data as T;
}
