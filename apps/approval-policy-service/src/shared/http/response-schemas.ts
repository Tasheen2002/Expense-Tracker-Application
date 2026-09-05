/**
 * Reusable JSON-Schema builders for Fastify `schema.response` blocks.
 *
 * Every route should pass its inner data shape into `successResponse()` /
 * `errorResponse()` rather than redefining the `{ success, statusCode,
 * message, data }` envelope inline. The runtime body produced by
 * `apps/api/src/shared/response.helper.ts` matches these shapes 1:1, so
 * Swagger docs stay in sync with what clients actually receive.
 */

/**
 * 200/201 success response carrying typed `data`.
 *
 * @example
 *   response: {
 *     200: successResponse(userResponseSchema),
 *     201: successResponse(orderResponseSchema, 201),
 *   }
 */
export const successResponse = (
  dataSchema: object,
  statusCode: number = 200,
) =>
  ({
    type: "object",
    required: ["success", "statusCode", "message", "data"],
    additionalProperties: false,
    properties: {
      success: { type: "boolean", const: true },
      statusCode: { type: "number", const: statusCode },
      message: { type: "string" },
      data: dataSchema,
    },
  }) as const;

/**
 * 204 No Content response — DELETE endpoints, idempotent operations.
 *
 * @example
 *   response: {
 *     204: noContentResponse,
 *   }
 */
export const noContentResponse = {
  description: "No content",
  type: "null",
} as const;

/**
 * 200 OK response for state-change actions that have no data payload —
 * cancel, unsubscribe, mark-as-sent, etc. Matches the body produced by
 * `ResponseHelper.fromCommand(reply, result, msg)` when the command is
 * `CommandResult<void>` (no `data` key in the runtime body).
 *
 * Prefer this over `successResponse({ type: "object" })` (untyped catch-all)
 * for void actions. Use `noContentResponse` (204) when the route truly
 * has no response body at all (DELETE).
 *
 * @example
 *   response: {
 *     200: actionSuccessResponse(),
 *   }
 */
export const actionSuccessResponse = (statusCode: number = 200) =>
  ({
    type: "object",
    required: ["success", "statusCode", "message"],
    additionalProperties: false,
    properties: {
      success: { type: "boolean", const: true },
      statusCode: { type: "number", const: statusCode },
      message: { type: "string" },
    },
  }) as const;

/**
 * Standard error-envelope response schema. The runtime error body
 * produced by `ResponseHelper.error(reply, error)` matches this shape:
 * `{ success: false, statusCode, message, code?, details? }`.
 *
 * `code` is the stable error code from `DomainError` (e.g. `EXPENSE_NOT_FOUND`).
 * `details` is an optional structured payload — typically validation errors.
 *
 * @example
 *   response: {
 *     400: errorResponse(400),
 *     404: errorResponse(404),
 *     422: errorResponse(422),
 *   }
 */
export const errorResponse = (statusCode: number) =>
  ({
    type: "object",
    required: ["success", "statusCode", "message"],
    additionalProperties: false,
    properties: {
      success: { type: "boolean", const: false },
      statusCode: { type: "number", const: statusCode },
      message: { type: "string" },
      code: { type: "string" },
      details: { type: "object", additionalProperties: true },
    },
  }) as const;

/**
 * Helper to build the canonical paginated-list inner shape from an item
 * schema. Use inside `successResponse()` for list endpoints.
 *
 * Mirrors `PaginatedResult<T>` from
 * `packages/core/src/domain/interfaces/paginated-result.interface.ts`.
 *
 * @example
 *   response: {
 *     200: successResponse(paginatedResponse(expenseResponseSchema)),
 *   }
 */
export const paginatedResponse = (itemSchema: object) =>
  ({
    type: "object",
    required: ["items", "total", "limit", "offset", "hasMore"],
    additionalProperties: false,
    properties: {
      items: { type: "array", items: itemSchema },
      total: { type: "integer" },
      limit: { type: "integer" },
      offset: { type: "integer" },
      hasMore: { type: "boolean" },
    },
  }) as const;

