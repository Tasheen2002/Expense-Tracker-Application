export class QueryResult<T = any> {
  constructor(
    public readonly success: boolean,
    public readonly data: T | null,
    public readonly error?: string,
    public readonly statusCode?: number
  ) {}

  static success<T>(data: T): QueryResult<T> {
    return new QueryResult(true, data);
  }

  static failure<T>(error: string, statusCode?: number): QueryResult<T> {
    return new QueryResult<T>(false, null, error, statusCode);
  }

  static fromError<T>(error: unknown): QueryResult<T> {
    const message = error instanceof Error ? error.message : 'Query failed';
    const statusCode =
      error && typeof error === 'object' && 'statusCode' in error
        ? (error as { statusCode: number }).statusCode
        : 500;
    return QueryResult.failure<T>(message, statusCode);
  }

  get isSuccess(): boolean {
    return this.success;
  }

  get isFailure(): boolean {
    return !this.success;
  }
}
