import fp from 'fastify-plugin';
import {
  FastifyPluginAsync,
  FastifyError,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import { ZodError } from 'zod';
import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from '../shared/infrastructure/persistence/prisma.client';
import { resolveHttpStatus } from '../shared/errors/error-http-mapper';

abstract class DomainError extends Error {
  abstract readonly statusCode: number;
}

const errorPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler(
    (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
      request.log.error({
        err: error,
        url: request.url,
        method: request.method,
      });

      if (error.validation) {
        return reply.status(400).send({
          success: false,
          statusCode: 400,
          error: 'VALIDATION_ERROR',
          message: error.message,
        });
      }

      if (error.code === 'FST_ERR_VALIDATION') {
        return reply.status(400).send({
          success: false,
          statusCode: 400,
          error: 'VALIDATION_ERROR',
          message: error.message,
        });
      }

      if (
        'statusCode' in error &&
        typeof error.statusCode === 'number' &&
        error.statusCode < 500
      ) {
        return reply.status(error.statusCode).send({
          success: false,
          statusCode: error.statusCode,
          message: error.message,
          error: error.name,
        });
      }

      if (error instanceof ZodError) {
        return reply.status(400).send({
          success: false,
          statusCode: 400,
          error: 'Validation Error',
          message: 'Invalid request data',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }

      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return reply.status(409).send({
            success: false,
            statusCode: 409,
            error: 'Conflict',
            message: 'Resource already exists',
            details: error.meta,
          });
        }

        if (error.code === 'P2025') {
          return reply.status(404).send({
            success: false,
            statusCode: 404,
            error: 'Not Found',
            message: 'Resource not found',
          });
        }

        if (error.code === 'P2003') {
          return reply.status(400).send({
            success: false,
            statusCode: 400,
            error: 'Bad Request',
            message: 'Invalid reference to related resource',
          });
        }
      }

      if (error instanceof PrismaClientValidationError) {
        return reply.status(400).send({
          success: false,
          statusCode: 400,
          error: 'Validation Error',
          message: 'Invalid database operation',
        });
      }



      const resolvedStatus = resolveHttpStatus(error);
      if (resolvedStatus < 500) {
        const errWithCode = error as Error & { code?: string };
        return reply.status(resolvedStatus).send({
          success: false,
          statusCode: resolvedStatus,
          error: error.name,
          code: errWithCode.code,
          message: error.message,
        });
      }

      const statusCode =
        typeof error.statusCode === 'number' && error.statusCode >= 500 && error.statusCode < 600
          ? error.statusCode
          : 500;  // Strict range check: only pass through valid 5xx codes
      const isDevelopment = process.env.NODE_ENV === 'development';

      return reply.status(statusCode).send({
        success: false,
        statusCode,
        error: 'Internal Server Error',
        message: isDevelopment ? error.message : 'An unexpected error occurred',
        ...(isDevelopment && { stack: error.stack }),
      });
    }
  );

  fastify.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      success: false,
      statusCode: 404,
      error: 'Not Found',
      message: `Route ${request.method}:${request.url} not found`,
    });
  });

  fastify.log.info('Error handler plugin registered');
};

export default fp(errorPlugin, {
  name: 'error-plugin',
});
export { DomainError };
