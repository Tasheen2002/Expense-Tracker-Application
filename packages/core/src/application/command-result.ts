export class CommandResult<T> {
  constructor(
    public readonly success: boolean,
    public readonly data?: T,
    public readonly error?: string,
    public readonly errors?: string[],
    public readonly statusCode?: number
  ) {}

  static success<T>(data?: T): CommandResult<T> {
    return new CommandResult(true, data);
  }

  static failure<T>(
    error: string,
    fieldErrors?: string[],
    statusCode?: number
  ): CommandResult<T> {
    return new CommandResult<T>(
      false,
      undefined,
      error,
      fieldErrors,
      statusCode
    );
  }

  static fromError<T>(error: unknown): CommandResult<T> {
    const message = error instanceof Error ? error.message : 'Command failed';
    const statusCode =
      error && typeof error === 'object' && 'statusCode' in error
        ? (error as { statusCode: number }).statusCode
        : 500;
    return CommandResult.failure<T>(message, undefined, statusCode);
  }
}
