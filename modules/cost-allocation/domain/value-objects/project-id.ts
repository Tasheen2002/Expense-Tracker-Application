import { randomUUID } from "crypto";

export class ProjectId {
  private static readonly UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  private constructor(private readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error("ProjectId cannot be empty");
    }
    if (!ProjectId.UUID_REGEX.test(value)) {
      throw new Error("ProjectId must be a valid UUID format");
    }
  }

  static create(): ProjectId {
    return new ProjectId(randomUUID());
  }

  static fromString(id: string): ProjectId {
    return new ProjectId(id);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: ProjectId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
