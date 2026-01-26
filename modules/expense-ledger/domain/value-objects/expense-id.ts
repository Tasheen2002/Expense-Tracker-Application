import { randomUUID } from 'crypto'

export class ExpenseId {
  private readonly value: string

  private constructor(value: string) {
    this.value = value
  }

  static create(): ExpenseId {
    return new ExpenseId(randomUUID())
  }

  static fromString(id: string): ExpenseId {
    if (!this.isValid(id)) {
      throw new Error('Invalid expense ID format')
    }
    return new ExpenseId(id)
  }

  static isValid(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(id)
  }

  getValue(): string {
    return this.value
  }

  equals(other: ExpenseId): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
