import { FastifyRequest, FastifyReply } from 'fastify';
import { ZodSchema, ZodError } from 'zod';

interface ValidationErrorResponse {
  success: false;
  statusCode: 400;
  error: string;
  message: string;
  errors: Array<{ field: string; message: string }>;
}

function formatZodErrors(error: ZodError): ValidationErrorResponse['errors'] {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
}

export function validateBody<T extends ZodSchema>(schema: T) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.body = schema.parse(request.body);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          success: false,
          statusCode: 400,
          error: 'VALIDATION_ERROR',
          message: 'Validation failed',
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
          error: 'VALIDATION_ERROR',
          message: 'Validation failed',
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
          error: 'VALIDATION_ERROR',
          message: 'Validation failed',
          errors: formatZodErrors(error),
        });
      }
      throw error;
    }
  };
}
