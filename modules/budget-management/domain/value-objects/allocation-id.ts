import { randomUUID } from 'crypto'

export class AllocationId {
  private constructor(private readonly value: string) {
    if (!value) {
      throw new Error('Allocation ID cannot be empty')
    }

    if (!this.isValidUuid(value)) {
      throw new Error('Allocation ID must be a valid UUID')
    }
  }

  static create(): AllocationId {
    return new AllocationId(randomUUID())
  }

  static fromString(value: string): AllocationId {
    return new AllocationId(value)
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

  private isValidUuid(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  }
}
