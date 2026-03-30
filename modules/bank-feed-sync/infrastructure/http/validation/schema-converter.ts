import { zodToJsonSchema } from "zod-to-json-schema";
import { z } from "zod";

/**
 * Converts a Zod schema to a Fastify-compatible JSON Schema
 * Removes $schema property to prevent Fastify validation issues
 */
export function toFastifySchema<T extends z.ZodType>(zodSchema: T) {
  const jsonSchema = zodToJsonSchema(zodSchema, {
    target: "openApi3",
    $refStrategy: "none",
  });

  // Remove $schema property as Fastify doesn't need it
  const { $schema, ...rest } = jsonSchema as any;
  return rest;
}

/**
 * Helper to create Fastify route schemas from Zod schemas
 */
export function createRouteSchema(schemas: {
  body?: z.ZodType;
  params?: z.ZodType;
  querystring?: z.ZodType;
  headers?: z.ZodType;
}) {
  const routeSchema: any = {};

  if (schemas.body) {
    routeSchema.body = toFastifySchema(schemas.body);
  }

  if (schemas.params) {
    routeSchema.params = toFastifySchema(schemas.params);
  }

  if (schemas.querystring) {
    routeSchema.querystring = toFastifySchema(schemas.querystring);
  }

  if (schemas.headers) {
    routeSchema.headers = toFastifySchema(schemas.headers);
  }

  return routeSchema;
}
