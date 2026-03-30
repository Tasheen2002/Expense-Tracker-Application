import { z } from "zod";

/**
 * Command/Query Result Pattern
 * Unified response pattern for CQRS operations
 */
export interface CommandResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
}

export class CommandResultHelper {
  static success<T>(data?: T): CommandResult<T> {
    return {
      success: true,
      data,
    };
  }

  static failure<T>(error: string, errors?: string[]): CommandResult<T> {
    return {
      success: false,
      error,
      errors: errors || [error],
    };
  }
}

/**
 * Base Command Interface
 */
export interface ICommand {
  // Marker interface for commands
}

/**
 * Base Query Interface
 */
export interface IQuery {
  // Marker interface for queries
}

/**
 * Command Handler Interface
 */
export interface ICommandHandler<TCommand extends ICommand, TResult = CommandResult<void>> {
  handle(command: TCommand): Promise<TResult>;
}

/**
 * Query Handler Interface
 */
export interface IQueryHandler<TQuery extends IQuery, TResult = CommandResult<any>> {
  handle(query: TQuery): Promise<TResult>;
}

/**
 * Validation Helper
 */
export class ValidationHelper {
  static validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; errors?: string[] } {
    const result = schema.safeParse(data);
    
    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    }
   
    return {
      success: false,
      errors: result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
    };
  }
}
