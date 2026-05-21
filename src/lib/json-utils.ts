/**
 * Safely parse JSON string or return fallback value.
 * @param jsonStr - JSON string to parse
 * @param fallback - Fallback value if parsing fails (default: null)
 * @returns Parsed object or fallback
 */
export function safeJsonParse<T = unknown>(
  jsonStr: string | null | undefined,
  fallback: T | null = null
): T | null {
  if (!jsonStr) return fallback;
  try {
    return JSON.parse(jsonStr) as T;
  } catch (e) {
    console.error("[safeJsonParse] Failed to parse JSON:", e);
    return fallback;
  }
}
