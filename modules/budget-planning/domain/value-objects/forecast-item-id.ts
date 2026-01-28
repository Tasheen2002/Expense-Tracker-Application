import { randomUUID } from "crypto";

export class ForecastItemId {
  private constructor(private readonly value: string) {
    if (!value || value.trim() === "") {
      throw new Error("ForecastItemId cannot be empty");
    }
    if (!ForecastItemId.isValid(value)) {
      throw new Error("ForecastItemId must be a valid UUID v4");
    }
  }

  static create(): ForecastItemId {
    return new ForecastItemId(randomUUID());
  }

  static fromString(id: string): ForecastItemId {
    return new ForecastItemId(id);
  }

  static isValid(id: string): boolean {
    const uuidV4Regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidV4Regex.test(id);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: ForecastItemId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
