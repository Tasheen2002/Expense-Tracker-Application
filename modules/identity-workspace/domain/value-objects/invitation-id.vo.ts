import { randomUUID } from 'crypto'

export class InvitationId {
  private static readonly UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  private constructor(private readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('InvitationId cannot be empty')
    }
    if (!InvitationId.UUID_REGEX.test(value)) {
      throw new Error('InvitationId must be a valid UUID format')
    }
  }

  static create(): InvitationId {
    return new InvitationId(randomUUID())
  }

  static fromString(id: string): InvitationId {
    return new InvitationId(id)
  }

  getValue(): string {
    return this.value
  }

  equals(other: InvitationId): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
