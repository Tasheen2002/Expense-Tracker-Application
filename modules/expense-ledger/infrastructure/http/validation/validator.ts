import { FastifyRequest, FastifyReply } from 'fastify'
import { ZodSchema, ZodError } from 'zod'

/**
 * Validation error response type
 */
interface ValidationErrorResponse {
  success: false
  statusCode: 400
  message: string
  errors: Array<{
    field: string
    message: string
  }>
}

/**
 * Format Zod validation errors
 */
function formatZodErrors(error: ZodError): ValidationErrorResponse['errors'] {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }))
}

/**
 * Validate request body middleware
 */
export function validateBody<T extends ZodSchema>(schema: T) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.body = schema.parse(request.body)
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          success: false,
          statusCode: 400,
          message: 'Validation failed',
          errors: formatZodErrors(error),
        })
      }
      throw error
    }
  }
}

/**
 * Validate request query parameters middleware
 */
export function validateQuery<T extends ZodSchema>(schema: T) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.query = schema.parse(request.query)
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          success: false,
          statusCode: 400,
          message: 'Validation failed',
          errors: formatZodErrors(error),
        })
      }
      throw error
    }
  }
}

/**
 * Validate request params middleware
 */
export function validateParams<T extends ZodSchema>(schema: T) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.params = schema.parse(request.params)
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          success: false,
          statusCode: 400,
          message: 'Validation failed',
          errors: formatZodErrors(error),
        })
      }
      throw error
    }
  }
}
