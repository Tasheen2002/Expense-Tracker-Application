import { randomUUID } from 'crypto'

export class MetadataId {
  private constructor(private readonly value: string) {
    if (!value) {
      throw new Error('Metadata ID cannot be empty')
    }
    if (!this.isValidUuid(value)) {
      throw new Error('Metadata ID must be a valid UUID')
    }
  }

  static create(): MetadataId {
    return new MetadataId(randomUUID())
  }

  static fromString(value: string): MetadataId {
    return new MetadataId(value)
  }

  getValue(): string {
    return this.value
  }

  equals(other: MetadataId): boolean {
    return this.value === other.value
  }

  private isValidUuid(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  }
}
