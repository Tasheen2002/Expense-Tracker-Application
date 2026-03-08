export class QueryResult<T = any> {
  constructor(
    public readonly success: boolean,
    public readonly data: T | null,
    public readonly error?: string,
  ) {}

  static success<T>(data: T): QueryResult<T> {
    return new QueryResult(true, data);
  }

  static failure<T>(error: string): QueryResult<T> {
    return new QueryResult<T>(false, null, error);
  }

  get isSuccess(): boolean {
    return this.success;
  }

  get isFailure(): boolean {
    return !this.success;
  }
}
