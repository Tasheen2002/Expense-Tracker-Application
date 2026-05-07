/**
 * Expense Tracker shared Zod schemas.
 *
 * Each subdirectory mirrors a backend bounded context. The intent is for the
 * BACKEND'S Zod schemas (currently in `modules/<x>/infra/http/validation/`)
 * to be migrated/re-exported here so the frontend can reuse the exact same
 * validators in form components — eliminating wire-shape drift between
 * client and server. Module-by-module migration happens in the canonical
 * pattern phase; the directory shape starts with the cross-cutting
 * `common/` exports.
 */

export * from "./common";
