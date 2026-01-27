import { randomUUID } from 'crypto';

export class AllocationId {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(): AllocationId {
    return new AllocationId(randomUUID());
  }

  static fromString(value: string): AllocationId {
    if (!value || typeof value !== 'string') {
      throw new Error('Allocation ID must be a non-empty string');
    }

    // Basic UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new Error('Allocation ID must be a valid UUID');
    }

    return new AllocationId(value);
  }

  get value(): string {
    return this._value;
  }

  equals(other: AllocationId): boolean {
    if (!other) return false;
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
