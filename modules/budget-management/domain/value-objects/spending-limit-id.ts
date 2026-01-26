import { randomUUID } from 'crypto'

export class SpendingLimitId {
  private constructor(private readonly value: string) {
    if (!value) {
      throw new Error('Spending Limit ID cannot be empty')
    }

    if (!this.isValidUuid(value)) {
      throw new Error('Spending Limit ID must be a valid UUID')
    }
  }

  static create(): SpendingLimitId {
    return new SpendingLimitId(randomUUID())
  }

  static fromString(value: string): SpendingLimitId {
    return new SpendingLimitId(value)
  }

  getValue(): string {
    return this.value
  }

  equals(other: SpendingLimitId): boolean {
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
