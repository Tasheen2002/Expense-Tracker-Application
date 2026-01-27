export class ProjectCode {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(value: string): ProjectCode {
    if (!value || typeof value !== 'string') {
      throw new Error('Project code must be a non-empty string');
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new Error('Project code cannot be empty');
    }

    if (trimmed.length > 20) {
      throw new Error('Project code cannot exceed 20 characters');
    }

    // Only allow alphanumeric, hyphens, and underscores
    if (!/^[A-Z0-9\-_]+$/i.test(trimmed)) {
      throw new Error('Project code can only contain letters, numbers, hyphens, and underscores');
    }

    return new ProjectCode(trimmed.toUpperCase());
  }

  get value(): string {
    return this._value;
  }

  equals(other: ProjectCode): boolean {
    if (!other) return false;
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
