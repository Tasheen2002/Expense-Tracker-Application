import { FastifyReply, FastifyRequest } from 'fastify';
import { ZodError, ZodSchema } from 'zod';

export const validateBody = (schema: ZodSchema) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.body = await schema.parseAsync(request.body);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          success: false,
          statusCode: 400,
          message: 'Validation failed',
          error: 'VALIDATION_ERROR',
          errors: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      throw error;
    }
  };
};

export const validateParams = (schema: ZodSchema) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.params = await schema.parseAsync(request.params);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          success: false,
          statusCode: 400,
          message: 'Invalid parameters',
          error: 'VALIDATION_ERROR',
          errors: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      throw error;
    }
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.query = await schema.parseAsync(request.query);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          success: false,
          statusCode: 400,
          message: 'Invalid query parameters',
          error: 'VALIDATION_ERROR',
          errors: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      throw error;
    }
  };
};
