import { FastifyRequest, FastifyReply } from 'fastify'
import { ZodSchema, ZodError } from 'zod'

export interface ValidationError {
  field: string
  message: string
}

export class ValidationException extends Error {
  constructor(
    public readonly errors: ValidationError[],
    public readonly statusCode: number = 400
  ) {
    super('Validation failed')
    this.name = 'ValidationException'
  }
}

export function validateBody<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const validated = schema.parse(request.body)
      request.body = validated
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors: ValidationError[] = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))

        return reply.status(400).send({
          error: 'Validation Error',
          message: 'Invalid request body',
          details: validationErrors,
        })
      }
      throw error
    }
  }
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const validated = schema.parse(request.query)
      request.query = validated as any
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors: ValidationError[] = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))

        return reply.status(400).send({
          error: 'Validation Error',
          message: 'Invalid query parameters',
          details: validationErrors,
        })
      }
      throw error
    }
  }
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const validated = schema.parse(request.params)
      request.params = validated as any
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors: ValidationError[] = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))

        return reply.status(400).send({
          error: 'Validation Error',
          message: 'Invalid path parameters',
          details: validationErrors,
        })
      }
      throw error
    }
  }
}
