import { z } from 'zod';

export type DateRange = 'last30days' | 'last90days' | 'lastYear' | 'allTime';

/**
 * Backend only schema is used for find search params.
 *
 * Does not catch, because TRPC Open API won't allow catches as a type.
 *
 * Keep this and `ZUrlSearchParamsSchema` in sync.
 */
export const ZFindSearchParamsSchema = z.object({
  query: z.string().describe('The search query.').optional(),
  page: z.coerce.number().min(1).describe('The pagination page number, starts at 1.').optional(),
  perPage: z.coerce.number().min(1).describe('The number of items per page.').max(100).optional(),
  contractType: z.string().describe('Filter by contract type.').optional(),
  counterpartyName: z.string().describe('Filter by counterparty name.').optional(),
  contractAmount: z.string().describe('Filter by contract amount.').optional(),
  contractDateFrom: z.string().describe('Filter by contract date from (yyyy-MM-dd).').optional(),
  contractDateTo: z.string().describe('Filter by contract date to (yyyy-MM-dd).').optional(),
});

/**
 * Frontend schema used to parse search params from URL.
 *
 * Keep this and `ZFindSearchParamsSchema` in sync.
 */
export const ZUrlSearchParamsSchema = z.object({
  query: z
    .string()
    .optional()
    .catch(() => undefined),
  page: z.coerce
    .number()
    .min(1)
    .optional()
    .catch(() => undefined),
  perPage: z.coerce
    .number()
    .min(1)
    .max(100)
    .optional()
    .catch(() => undefined),
  contractType: z
    .string()
    .optional()
    .catch(() => undefined),
  counterpartyName: z
    .string()
    .optional()
    .catch(() => undefined),
  contractAmount: z
    .string()
    .optional()
    .catch(() => undefined),
  contractDateFrom: z
    .string()
    .optional()
    .catch(() => undefined),
  contractDateTo: z
    .string()
    .optional()
    .catch(() => undefined),
});

export const ZFindResultResponse = z.object({
  data: z.union([z.array(z.unknown()), z.unknown()]).describe('The results from the search.'),
  count: z.number().describe('The total number of items.'),
  currentPage: z.number().describe('The current page number, starts at 1.'),
  perPage: z.number().describe('The number of items per page.'),
  totalPages: z.number().describe('The total number of pages.'),
});

// Can't infer generics from Zod.
export type FindResultResponse<T> = {
  data: T extends Array<unknown> ? T : T[];
  count: number;
  currentPage: number;
  perPage: number;
  totalPages: number;
};
