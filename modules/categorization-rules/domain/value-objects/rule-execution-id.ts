import { randomUUID } from 'crypto'

export class RuleExecutionId {
  private constructor(private readonly value: string) {
    if (!value || value.trim() === '') {
      throw new Error('RuleExecutionId cannot be empty')
    }
    if (!RuleExecutionId.isValid(value)) {
      throw new Error('RuleExecutionId must be a valid UUID v4')
    }
  }

  static create(): RuleExecutionId {
    return new RuleExecutionId(randomUUID())
  }

  static fromString(id: string): RuleExecutionId {
    return new RuleExecutionId(id)
  }

  static isValid(id: string): boolean {
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidV4Regex.test(id)
  }

  getValue(): string {
    return this.value
  }

  equals(other: RuleExecutionId): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
