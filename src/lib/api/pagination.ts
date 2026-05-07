import { z } from "zod";

export const paginationSchema = z.object({
  take: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  q: z.string().max(200).optional(),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

/**
 * Given a list of items that may contain one extra (take+1),
 * returns the page slice and the nextCursor id if there's a next page.
 */
export function buildPaginationResponse<T extends { id: string }>(
  items: T[],
  take: number
): { items: T[]; nextCursor: string | null } {
  const hasMore = items.length > take;
  const data = hasMore ? items.slice(0, take) : items;
  return {
    items: data,
    nextCursor: hasMore ? data[data.length - 1].id : null,
  };
}
