import { randomUUID } from 'crypto'

export class DepartmentId {
  private constructor(private readonly value: string) {
    if (!value || value.trim() === '') {
      throw new Error('DepartmentId cannot be empty')
    }
    if (!DepartmentId.isValid(value)) {
      throw new Error('DepartmentId must be a valid UUID v4')
    }
  }

  static create(): DepartmentId {
    return new DepartmentId(randomUUID())
  }

  static fromString(id: string): DepartmentId {
    return new DepartmentId(id)
  }

  static isValid(id: string): boolean {
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidV4Regex.test(id)
  }

  getValue(): string {
    return this.value
  }

  equals(other: DepartmentId): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
