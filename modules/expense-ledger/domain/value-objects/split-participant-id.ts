import { randomUUID } from "crypto";

export class SplitParticipantId {
  private constructor(private readonly value: string) {
    if (!SplitParticipantId.isValid(value)) {
      throw new Error(`Invalid SplitParticipantId format: ${value}`);
    }
  }

  static create(): SplitParticipantId {
    return new SplitParticipantId(randomUUID());
  }

  static fromString(id: string): SplitParticipantId {
    return new SplitParticipantId(id);
  }

  static isValid(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    );
  }

  getValue(): string {
    return this.value;
  }

  equals(other: SplitParticipantId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
