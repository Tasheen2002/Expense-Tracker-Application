import { randomUUID } from 'crypto'

export class RuleId {
  private constructor(private readonly value: string) {
    if (!value || value.trim() === '') {
      throw new Error('RuleId cannot be empty')
    }
    if (!RuleId.isValid(value)) {
      throw new Error('RuleId must be a valid UUID v4')
    }
  }

  static create(): RuleId {
    return new RuleId(randomUUID())
  }

  static fromString(id: string): RuleId {
    return new RuleId(id)
  }

  static isValid(id: string): boolean {
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidV4Regex.test(id)
  }

  getValue(): string {
    return this.value
  }

  equals(other: RuleId): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
