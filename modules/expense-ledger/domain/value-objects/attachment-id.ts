import { randomUUID } from 'crypto'

export class AttachmentId {
  private readonly value: string

  private constructor(value: string) {
    this.value = value
  }

  static create(): AttachmentId {
    return new AttachmentId(randomUUID())
  }

  static fromString(id: string): AttachmentId {
    if (!this.isValid(id)) {
      throw new Error('Invalid attachment ID format')
    }
    return new AttachmentId(id)
  }

  static isValid(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(id)
  }

  getValue(): string {
    return this.value
  }

  equals(other: AttachmentId): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
