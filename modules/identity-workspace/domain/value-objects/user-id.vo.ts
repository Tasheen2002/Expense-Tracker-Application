import { randomUUID } from 'crypto'

export class UserId {
  private constructor(private readonly value: string) {
    if (!value) {
      throw new Error('User ID cannot be empty')
    }

    if (!this.isValidUuid(value)) {
      throw new Error('User ID must be a valid UUID')
    }
  }

  static create(): UserId {
    return new UserId(randomUUID())
  }

  static fromString(value: string): UserId {
    return new UserId(value)
  }

  getValue(): string {
    return this.value
  }

  equals(other: UserId): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }

  private isValidUuid(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  }
}
