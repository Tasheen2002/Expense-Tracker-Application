import { randomUUID } from "crypto";

export class ForecastId {
  private constructor(private readonly value: string) {
    if (!value || value.trim() === "") {
      throw new Error("ForecastId cannot be empty");
    }
    if (!ForecastId.isValid(value)) {
      throw new Error("ForecastId must be a valid UUID v4");
    }
  }

  static create(): ForecastId {
    return new ForecastId(randomUUID());
  }

  static fromString(id: string): ForecastId {
    return new ForecastId(id);
  }

  static isValid(id: string): boolean {
    const uuidV4Regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidV4Regex.test(id);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: ForecastId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
