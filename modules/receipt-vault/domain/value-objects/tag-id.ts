import { randomUUID } from 'crypto'

export class TagId {
  private constructor(private readonly value: string) {
    if (!value) {
      throw new Error('Tag ID cannot be empty')
    }
    if (!this.isValidUuid(value)) {
      throw new Error('Tag ID must be a valid UUID')
    }
  }

  static create(): TagId {
    return new TagId(randomUUID())
  }

  static fromString(value: string): TagId {
    return new TagId(value)
  }

  getValue(): string {
    return this.value
  }

  equals(other: TagId): boolean {
    return this.value === other.value
  }

  private isValidUuid(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  }
}
