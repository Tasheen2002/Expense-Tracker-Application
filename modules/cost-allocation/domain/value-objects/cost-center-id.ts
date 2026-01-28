import { randomUUID } from 'crypto'

export class CostCenterId {
  private constructor(private readonly value: string) {
    if (!value || value.trim() === '') {
      throw new Error('CostCenterId cannot be empty')
    }
    if (!CostCenterId.isValid(value)) {
      throw new Error('CostCenterId must be a valid UUID v4')
    }
  }

  static create(): CostCenterId {
    return new CostCenterId(randomUUID())
  }

  static fromString(id: string): CostCenterId {
    return new CostCenterId(id)
  }

  static isValid(id: string): boolean {
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidV4Regex.test(id)
  }

  getValue(): string {
    return this.value
  }

  equals(other: CostCenterId): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
