import { FastifyRequest, FastifyReply } from "fastify";
import { z, ZodSchema, ZodError } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

function formatZodErrors(error: ZodError) {
  return error.errors.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

/**
 * Convert a Zod schema to a JSON Schema (draft-07) for use in Fastify
 * route schemas — `body`, `params`, `querystring` — and Swagger docs.
 *
 * Lets Zod be the single source of truth; eliminates manually maintaining
 * parallel inline JSON-Schema definitions in route files.
 *
 * Implementation note: wraps `zod-to-json-schema` so this works with the
 * project's current Zod 3.x. When the codebase migrates to Zod 4 the body
 * collapses to `z.toJSONSchema(schema, { target: "draft-7" })` with no
 * caller change.
 *
 * @example
 *   fastify.post('/x', {
 *     preHandler: [validateBody(createXSchema)],
 *     schema: { body: toJsonSchema(createXSchema) },
 *   }, ...);
 */
export function toJsonSchema(schema: ZodSchema): object {
  return zodToJsonSchema(schema, { target: "jsonSchema7" });
}

/**
 * Canonical pagination query schema. Use this directly for endpoints that
 * accept only `limit` and `offset`, or extend it for endpoints with
 * additional filters:
 *
 * @example
 *   const listX = paginationQuerySchema.extend({ status: z.enum(...) });
 *
 * Coerces query-string values (always strings on the wire) into numbers.
 */
export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().positive().optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export function validateBody<T extends ZodSchema>(schema: T) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.body = schema.parse(request.body);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          success: false,
          statusCode: 400,
          message: "Validation failed",
          error: "VALIDATION_ERROR",
          errors: formatZodErrors(error),
        });
      }
      throw error;
    }
  };
}

export function validateQuery<T extends ZodSchema>(schema: T) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.query = schema.parse(request.query);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          success: false,
          statusCode: 400,
          message: "Validation failed",
          error: "VALIDATION_ERROR",
          errors: formatZodErrors(error),
        });
      }
      throw error;
    }
  };
}

export function validateParams<T extends ZodSchema>(schema: T) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.params = schema.parse(request.params);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          success: false,
          statusCode: 400,
          message: "Validation failed",
          error: "VALIDATION_ERROR",
          errors: formatZodErrors(error),
        });
      }
      throw error;
    }
  };
}
