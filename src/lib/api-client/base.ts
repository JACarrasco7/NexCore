'use client';

/**
 * Base API client for frontend.
 * Handles fetching with automatic shape normalization, error handling, and typing.
 */

export interface ApiErrorResponse {
  error: string;
  code?: string;
  issues?: Array<{ path: (string | number)[]; message: string }>;
}

/**
 * Normalize common wrapper shapes.
 */
function normalizeResponse<T>(data: unknown): T {
  if (!data || typeof data !== 'object') {
    return data as T;
  }

  const obj = data as Record<string, unknown>;

  // Check for common list wrappers
  if (Array.isArray(obj.items)) return obj.items as T;
  if (Array.isArray(obj.results)) return obj.results as T;
  if (Array.isArray(obj.athletes)) return obj.athletes as T;
  if (Array.isArray(obj.plans)) return obj.plans as T;
  if (Array.isArray(obj.data)) return obj.data as T;

  // If it's already an array, return as is
  if (Array.isArray(data)) return data as T;

  return data as T;
}

/**
 * Fetch with automatic error handling and shape normalization.
 */
export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const error: ApiErrorResponse = await res.json().catch(() => ({
      error: `HTTP ${res.status}`,
    }));
    throw new Error(error.error || `API error: ${res.status}`);
  }

  const data = await res.json();
  return normalizeResponse<T>(data);
}

/**
 * POST request.
 */
export async function apiPost<T>(
  url: string,
  body: unknown,
  init?: RequestInit
): Promise<T> {
  return apiFetch<T>(url, {
    ...init,
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * PATCH request.
 */
export async function apiPatch<T>(
  url: string,
  body: unknown,
  init?: RequestInit
): Promise<T> {
  return apiFetch<T>(url, {
    ...init,
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/**
 * DELETE request.
 */
export async function apiDelete<T = { ok: true }>(
  url: string,
  init?: RequestInit
): Promise<T> {
  return apiFetch<T>(url, {
    ...init,
    method: 'DELETE',
  });
}

/**
 * PUT request.
 */
export async function apiPut<T>(
  url: string,
  body: unknown,
  init?: RequestInit
): Promise<T> {
  return apiFetch<T>(url, {
    ...init,
    method: 'PUT',
    body: JSON.stringify(body),
  });
}
