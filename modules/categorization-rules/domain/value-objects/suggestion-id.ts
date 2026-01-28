import { randomUUID } from 'crypto'

export class SuggestionId {
  private constructor(private readonly value: string) {
    if (!value || value.trim() === '') {
      throw new Error('SuggestionId cannot be empty')
    }
    if (!SuggestionId.isValid(value)) {
      throw new Error('SuggestionId must be a valid UUID v4')
    }
  }

  static create(): SuggestionId {
    return new SuggestionId(randomUUID())
  }

  static fromString(id: string): SuggestionId {
    return new SuggestionId(id)
  }

  static isValid(id: string): boolean {
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidV4Regex.test(id)
  }

  getValue(): string {
    return this.value
  }

  equals(other: SuggestionId): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
