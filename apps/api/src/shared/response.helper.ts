import { FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { CommandResult } from '../../../../packages/core/src/application/command-result';
import { QueryResult } from '../../../../packages/core/src/application/query-result';

/**
 * Standard success response format
 */
export interface SuccessResponse<T = any> {
  success: true;
  statusCode: number;
  message: string;
  data?: T;
}

/**
 * Standard error response format
 */
export interface ErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  error?: string;
}

export class ResponseHelper {
  private static getErrorName(statusCode: number): string {
    if (statusCode === 409) return 'Conflict';
    if (statusCode === 404) return 'Not Found';
    if (statusCode === 401) return 'Unauthorized';
    if (statusCode === 403) return 'Forbidden';
    if (statusCode === 410) return 'Gone';
    if (statusCode === 400) return 'Bad Request';
    return 'Internal Server Error';
  }

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
    if (statusCode === 204) {
      return reply.status(204).send();
    }

    const response: SuccessResponse<T> = {
      success: true,
      statusCode,
      message,
    };

    if (data !== undefined) {
      response.data = data;
    }

    return reply.status(statusCode).send(response);
  }

  /**
   * Send a 200 OK response
   */
  static ok<T>(reply: FastifyReply, message: string, data?: T): FastifyReply {
    return ResponseHelper.success(reply, 200, message, data);
  }

  /**
   * Send a 201 Created response
   */
  static created<T>(
    reply: FastifyReply,
    message: string,
    data?: T
  ): FastifyReply {
    return ResponseHelper.success(reply, 201, message, data);
  }

  /**
   * Send a 400 Bad Request response
   */
  static badRequest(reply: FastifyReply, message: string): FastifyReply {
    return reply.status(400).send({
      success: false,
      statusCode: 400,
      error: 'Bad Request',
      message,
    });
  }

  /**
   * Handle a CommandResult - sends appropriate response based on success/failure
   *
   * @param reply - Fastify reply object
   * @param result - CommandResult from a command handler
   * @param successMessage - Message to send on success
   * @param data - Optional data to send (overrides result.data)
   * @param successStatusCode - HTTP status code on success (default 200)
   */
  static fromCommand<T>(
    reply: FastifyReply,
    result: CommandResult<T>,
    successMessage: string,
    data?: any,
    successStatusCode: number = 200
  ): FastifyReply {
    if (!result.success) {
      const statusCode = result.statusCode ?? 400;
      return reply.status(statusCode).send({
        success: false,
        statusCode,
        error: ResponseHelper.getErrorName(statusCode),
        message: result.error ?? 'Operation failed',
      });
    }
    return ResponseHelper.success(
      reply,
      successStatusCode,
      successMessage,
      data !== undefined ? data : result.data
    );
  }

  /**
   * Handle a QueryResult - sends appropriate response based on success/failure
   *
   * @param reply - Fastify reply object
   * @param result - QueryResult from a query handler
   * @param successMessage - Message to send on success
   * @param data - Optional data to send (overrides result.data)
   */
  static fromQuery<T>(
    reply: FastifyReply,
    result: QueryResult<T>,
    successMessage: string,
    data?: any
  ): FastifyReply {
    if (!result.success) {
      const statusCode = result.statusCode ?? 404;
      return reply.status(statusCode).send({
        success: false,
        statusCode,
        error: ResponseHelper.getErrorName(statusCode),
        message: result.error ?? 'Resource not found',
      });
    }
    const finalData = data !== undefined ? data : (result.data ?? undefined);
    return ResponseHelper.ok(reply, successMessage, finalData);
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
    // Handle ZodError
    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        statusCode: 400,
        message: 'Validation failed',
        error: error.format(),
      });
    }

    // Extract statusCode from domain errors
    const statusCode =
      error && typeof error === 'object' && 'statusCode' in error
        ? (error as { statusCode: number }).statusCode
        : 500;

    // Extract error message
    const message =
      error instanceof Error ? error.message : 'Internal server error';

    // Extract error code/name for response
    const errorCode =
      error && typeof error === 'object' && 'code' in error
        ? (error as { code: string }).code
        : undefined;

    const errorName = ResponseHelper.getErrorName(statusCode);

    return reply.status(statusCode).send({
      success: false,
      statusCode,
      error: errorName,
      code: errorCode,
      message,
    });
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
      error: 'Unauthorized',
      message,
    });
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
    });
  }

  /**
   * Send a gone (410) response
   *
   * @param reply - Fastify reply object
   * @param message - Optional custom message
   */
  static gone(
    reply: FastifyReply,
    message: string = 'Resource is no longer available'
  ): FastifyReply {
    return reply.status(410).send({
      success: false,
      statusCode: 410,
      error: 'Gone',
      message,
    });
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
    });
  }
}
