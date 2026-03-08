export class CommandResult<T = any> {
  constructor(
    public readonly success: boolean,
    public readonly data?: T,
    public readonly error?: string,
    public readonly errors?: string[],
  ) {}

  static success<T>(data?: T): CommandResult<T> {
    return new CommandResult(true, data);
  }

  static failure<T>(error: string, fieldErrors?: string[]): CommandResult<T> {
    return new CommandResult<T>(false, undefined, error, fieldErrors);
  }
}
