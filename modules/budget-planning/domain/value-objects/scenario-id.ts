import { randomUUID } from "crypto";

export class ScenarioId {
  private constructor(private readonly value: string) {
    if (!value || value.trim() === "") {
      throw new Error("ScenarioId cannot be empty");
    }
    if (!ScenarioId.isValid(value)) {
      throw new Error("ScenarioId must be a valid UUID v4");
    }
  }

  static create(): ScenarioId {
    return new ScenarioId(randomUUID());
  }

  static fromString(id: string): ScenarioId {
    return new ScenarioId(id);
  }

  static isValid(id: string): boolean {
    const uuidV4Regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidV4Regex.test(id);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: ScenarioId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
