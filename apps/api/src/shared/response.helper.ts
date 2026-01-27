import { FastifyReply } from 'fastify'

/**
 * Standard success response format
 */
export interface SuccessResponse<T = any> {
  success: true
  statusCode: number
  message: string
  data?: T
}

/**
 * Standard error response format
 */
export interface ErrorResponse {
  success: false
  statusCode: number
  message: string
  error?: string
}

/**
 * Response helper utility for consistent API responses
 *
 * Provides standardized success and error response formats across all controllers.
 * Automatically extracts statusCode from domain errors.
 */
export class ResponseHelper {
  /**
   * Send a success response
   *
   * @param reply - Fastify reply object
   * @param statusCode - HTTP status code (200, 201, etc.)
   * @param message - Success message
   * @param data - Optional response data
   */
  static success<T>(
    reply: FastifyReply,
    statusCode: number,
    message: string,
    data?: T
  ): FastifyReply {
    const response: SuccessResponse<T> = {
      success: true,
      statusCode,
      message,
    }

    if (data !== undefined) {
      response.data = data
    }

    return reply.status(statusCode).send(response)
  }

  /**
   * Send an error response
   *
   * Automatically extracts statusCode from domain errors.
   * Falls back to 500 for unknown errors.
   *
   * @param reply - Fastify reply object
   * @param error - Error object (preferably a domain error with statusCode)
   */
  static error(reply: FastifyReply, error: unknown): FastifyReply {
    // Extract statusCode from domain errors
    const statusCode =
      error && typeof error === 'object' && 'statusCode' in error
        ? (error as { statusCode: number }).statusCode
        : 500

    // Extract error message
    const message =
      error instanceof Error
        ? error.message
        : 'Internal server error'

    const response: ErrorResponse = {
      success: false,
      statusCode,
      message,
    }

    return reply.status(statusCode).send(response)
  }

  /**
   * Send an unauthorized (401) response
   *
   * @param reply - Fastify reply object
   * @param message - Optional custom message
   */
  static unauthorized(
    reply: FastifyReply,
    message: string = 'User not authenticated'
  ): FastifyReply {
    return reply.status(401).send({
      success: false,
      statusCode: 401,
      message,
    })
  }

  /**
   * Send a forbidden (403) response
   *
   * @param reply - Fastify reply object
   * @param message - Optional custom message
   */
  static forbidden(
    reply: FastifyReply,
    message: string = 'Access forbidden'
  ): FastifyReply {
    return reply.status(403).send({
      success: false,
      statusCode: 403,
      message,
    })
  }

  /**
   * Send a not found (404) response
   *
   * @param reply - Fastify reply object
   * @param message - Optional custom message
   */
  static notFound(
    reply: FastifyReply,
    message: string = 'Resource not found'
  ): FastifyReply {
    return reply.status(404).send({
      success: false,
      statusCode: 404,
      message,
    })
  }
}
