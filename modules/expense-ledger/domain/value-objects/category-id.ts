import { randomUUID } from 'crypto'

export class CategoryId {
  private readonly value: string

  private constructor(value: string) {
    this.value = value
  }

  static create(): CategoryId {
    return new CategoryId(randomUUID())
  }

  static fromString(id: string): CategoryId {
    if (!this.isValid(id)) {
      throw new Error('Invalid category ID format')
    }
    return new CategoryId(id)
  }

  static isValid(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(id)
  }

  getValue(): string {
    return this.value
  }

  equals(other: CategoryId): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
