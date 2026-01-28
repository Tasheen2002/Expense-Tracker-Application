import { randomUUID } from 'crypto'

export class ProjectId {
  private constructor(private readonly value: string) {
    if (!value || value.trim() === '') {
      throw new Error('ProjectId cannot be empty')
    }
    if (!ProjectId.isValid(value)) {
      throw new Error('ProjectId must be a valid UUID v4')
    }
  }

  static create(): ProjectId {
    return new ProjectId(randomUUID())
  }

  static fromString(id: string): ProjectId {
    return new ProjectId(id)
  }

  static isValid(id: string): boolean {
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidV4Regex.test(id)
  }

  getValue(): string {
    return this.value
  }

  equals(other: ProjectId): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
