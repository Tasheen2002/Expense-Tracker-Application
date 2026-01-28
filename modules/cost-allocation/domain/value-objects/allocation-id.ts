import { randomUUID } from 'crypto'

export class AllocationId {
  private constructor(private readonly value: string) {
    if (!value || value.trim() === '') {
      throw new Error('AllocationId cannot be empty')
    }
    if (!AllocationId.isValid(value)) {
      throw new Error('AllocationId must be a valid UUID v4')
    }
  }

  static create(): AllocationId {
    return new AllocationId(randomUUID())
  }

  static fromString(id: string): AllocationId {
    return new AllocationId(id)
  }

  static isValid(id: string): boolean {
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidV4Regex.test(id)
  }

  getValue(): string {
    return this.value
  }

  equals(other: AllocationId): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
