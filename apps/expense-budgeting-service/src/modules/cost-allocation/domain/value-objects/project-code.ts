import { InvalidCodeError } from "../errors/cost-allocation.errors";

export class ProjectCode {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(value: string): ProjectCode {
    if (!value || typeof value !== "string") {
      throw new InvalidCodeError("Project", "must be a non-empty string");
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new InvalidCodeError("Project", "cannot be empty");
    }

    if (trimmed.length > 20) {
      throw new InvalidCodeError("Project", "cannot exceed 20 characters");
    }

    // Only allow alphanumeric, hyphens, and underscores
    if (!/^[A-Z0-9\-_]+$/i.test(trimmed)) {
      throw new InvalidCodeError(
        "Project",
        "can only contain letters, numbers, hyphens, and underscores",
      );
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
