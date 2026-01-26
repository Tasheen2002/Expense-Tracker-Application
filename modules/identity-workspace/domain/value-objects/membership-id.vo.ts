import { randomUUID } from 'crypto'

export class MembershipId {
  private static readonly UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  private constructor(private readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('MembershipId cannot be empty')
    }
    if (!MembershipId.UUID_REGEX.test(value)) {
      throw new Error('MembershipId must be a valid UUID format')
    }
  }

  static create(): MembershipId {
    return new MembershipId(randomUUID())
  }

  static fromString(id: string): MembershipId {
    return new MembershipId(id)
  }

  getValue(): string {
    return this.value
  }

  equals(other: MembershipId): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
