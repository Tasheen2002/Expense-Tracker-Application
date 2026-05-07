import { ZodSchema, ZodError } from 'zod';
import { FastifyRequest, FastifyReply } from 'fastify';

export function validateBody<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      request.body = schema.parse(request.body);
    } catch (error) {
      if (error instanceof ZodError) {
        reply.status(400).send({
          success: false,
          statusCode: 400,
          message: 'Validation failed',
          error: error.format(),
        });
      } else {
        throw error;
      }
    }
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      request.params = schema.parse(request.params) as Record<string, unknown>;
    } catch (error) {
      if (error instanceof ZodError) {
        reply.status(400).send({
          success: false,
          statusCode: 400,
          message: 'Invalid path parameters',
          error: error.format(),
        });
      } else {
        throw error;
      }
    }
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      request.query = schema.parse(request.query) as Record<string, unknown>;
    } catch (error) {
      if (error instanceof ZodError) {
        reply.status(400).send({
          success: false,
          statusCode: 400,
          message: 'Invalid query parameters',
          error: error.format(),
        });
      } else {
        throw error;
      }
    }
  };
}
