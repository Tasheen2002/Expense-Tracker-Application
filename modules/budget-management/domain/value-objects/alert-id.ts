import { randomUUID } from 'crypto'

export class AlertId {
  private constructor(private readonly value: string) {
    if (!value) {
      throw new Error('Alert ID cannot be empty')
    }

    if (!this.isValidUuid(value)) {
      throw new Error('Alert ID must be a valid UUID')
    }
  }

  static create(): AlertId {
    return new AlertId(randomUUID())
  }

  static fromString(value: string): AlertId {
    return new AlertId(value)
  }

  getValue(): string {
    return this.value
  }

  equals(other: AlertId): boolean {
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
