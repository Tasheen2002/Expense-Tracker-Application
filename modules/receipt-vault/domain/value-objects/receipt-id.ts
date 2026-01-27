import { randomUUID } from 'crypto'

export class ReceiptId {
  private constructor(private readonly value: string) {
    if (!value) {
      throw new Error('Receipt ID cannot be empty')
    }
    if (!this.isValidUuid(value)) {
      throw new Error('Receipt ID must be a valid UUID')
    }
  }

  static create(): ReceiptId {
    return new ReceiptId(randomUUID())
  }

  static fromString(value: string): ReceiptId {
    return new ReceiptId(value)
  }

  getValue(): string {
    return this.value
  }

  equals(other: ReceiptId): boolean {
    return this.value === other.value
  }

  private isValidUuid(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  }
}
