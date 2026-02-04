import { v4 as uuidv4 } from "uuid";

export class OutboxEventId {
  private constructor(private readonly value: string) {
    if (!value || value.trim() === "") {
      throw new Error("OutboxEventId cannot be empty");
    }
  }

  static create(): OutboxEventId {
    return new OutboxEventId(uuidv4());
  }

  static fromString(id: string): OutboxEventId {
    return new OutboxEventId(id);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: OutboxEventId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
