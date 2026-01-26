import fp from 'fastify-plugin'
import { FastifyPluginAsync, FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'

/**
 * Error Handler Plugin
 * Global error handling for the application
 * Following e-commerce pattern for error handling
 */
const errorPlugin: FastifyPluginAsync = async (fastify) => {
  /**
   * Custom error handler
   */
  fastify.setErrorHandler(
    (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
      // Log the error
      request.log.error({
        err: error,
        url: request.url,
        method: request.method,
      })

      // Fastify validation errors (JSON Schema)
      if (error.code === 'FST_ERR_VALIDATION') {
        return reply.status(400).send({
          success: false,
          statusCode: 400,
          error: 'Bad Request',
          message: error.message,
        })
      }

      // Zod validation errors
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
        })
      }

      // Prisma errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Unique constraint violation
        if (error.code === 'P2002') {
          return reply.status(409).send({
            success: false,
            statusCode: 409,
            error: 'Conflict',
            message: 'Resource already exists',
            details: error.meta,
          })
        }

        // Record not found
        if (error.code === 'P2025') {
          return reply.status(404).send({
            success: false,
            statusCode: 404,
            error: 'Not Found',
            message: 'Resource not found',
          })
        }

        // Foreign key constraint violation
        if (error.code === 'P2003') {
          return reply.status(400).send({
            success: false,
            statusCode: 400,
            error: 'Bad Request',
            message: 'Invalid reference to related resource',
          })
        }
      }

      // Prisma validation errors
      if (error instanceof Prisma.PrismaClientValidationError) {
        return reply.status(400).send({
          success: false,
          statusCode: 400,
          error: 'Validation Error',
          message: 'Invalid database operation',
        })
      }

      // Fastify HTTP errors (from @fastify/sensible)
      if (error.statusCode && error.statusCode < 500) {
        return reply.status(error.statusCode).send({
          success: false,
          statusCode: error.statusCode,
          error: error.name,
          message: error.message,
        })
      }

      // Internal server errors (5xx)
      const statusCode = error.statusCode || 500
      const isDevelopment = process.env.NODE_ENV === 'development'

      return reply.status(statusCode).send({
        success: false,
        statusCode,
        error: 'Internal Server Error',
        message: isDevelopment ? error.message : 'An unexpected error occurred',
        ...(isDevelopment && { stack: error.stack }),
      })
    }
  )

  /**
   * Not Found handler
   */
  fastify.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      success: false,
      statusCode: 404,
      error: 'Not Found',
      message: `Route ${request.method}:${request.url} not found`,
    })
  })

  fastify.log.info('Error handler plugin registered')
}

export default fp(errorPlugin, {
  name: 'error-plugin',
})
