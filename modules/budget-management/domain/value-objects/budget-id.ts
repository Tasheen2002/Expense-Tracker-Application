import { randomUUID } from 'crypto'

export class BudgetId {
  private constructor(private readonly value: string) {
    if (!value) {
      throw new Error('Budget ID cannot be empty')
    }

    if (!this.isValidUuid(value)) {
      throw new Error('Budget ID must be a valid UUID')
    }
  }

  static create(): BudgetId {
    return new BudgetId(randomUUID())
  }

  static fromString(value: string): BudgetId {
    return new BudgetId(value)
  }

  getValue(): string {
    return this.value
  }

  equals(other: BudgetId): boolean {
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
