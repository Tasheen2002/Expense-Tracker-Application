import { randomUUID } from 'crypto'

export class TagId {
  private readonly value: string

  private constructor(value: string) {
    this.value = value
  }

  static create(): TagId {
    return new TagId(randomUUID())
  }

  static fromString(id: string): TagId {
    if (!this.isValid(id)) {
      throw new Error('Invalid tag ID format')
    }
    return new TagId(id)
  }

  static isValid(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(id)
  }

  getValue(): string {
    return this.value
  }

  equals(other: TagId): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
