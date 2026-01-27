import { randomUUID } from "crypto";

export class DepartmentId {
  private static readonly UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  private constructor(private readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error("DepartmentId cannot be empty");
    }
    if (!DepartmentId.UUID_REGEX.test(value)) {
      throw new Error("DepartmentId must be a valid UUID format");
    }
  }

  static create(): DepartmentId {
    return new DepartmentId(randomUUID());
  }

  static fromString(id: string): DepartmentId {
    return new DepartmentId(id);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: DepartmentId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
