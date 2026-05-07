/**
 * Shared TypeScript types across apps and packages.
 *
 * These are wire-level/UI-level types that `apps/web` (and any future admin
 * surface) consume alongside the generated API client. Domain entity DTOs are
 * pulled in via `@expense-tracker/api-client` (the generated OpenAPI SDK);
 * types here are anything not driven by the API (utility shapes, ID aliases,
 * the canonical API envelope).
 */

export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export type Nullable<T> = T | null;
export type Maybe<T> = T | undefined;

export type ISODateString = string;
export type UUID = string;

/**
 * Canonical paginated-list shape — mirrors `PaginatedResult<T>` from
 * `packages/core/src/domain/interfaces/paginated-result.interface.ts`.
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Canonical API envelope produced by `apps/api/src/shared/response.helper.ts`.
 * Every response — whether success or error — conforms to this shape.
 */
export interface ApiSuccess<T> {
  success: true;
  statusCode: number;
  message: string;
  data: T;
}

export interface ApiError {
  success: false;
  statusCode: number;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiError;
