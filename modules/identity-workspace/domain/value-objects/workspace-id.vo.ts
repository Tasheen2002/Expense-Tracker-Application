import { randomUUID } from 'crypto'

export class WorkspaceId {
  private constructor(private readonly value: string) {
    if (!value) {
      throw new Error('Workspace ID cannot be empty')
    }

    if (!this.isValidUuid(value)) {
      throw new Error('Workspace ID must be a valid UUID')
    }
  }

  static create(): WorkspaceId {
    return new WorkspaceId(randomUUID())
  }

  static fromString(value: string): WorkspaceId {
    return new WorkspaceId(value)
  }

  getValue(): string {
    return this.value
  }

  equals(other: WorkspaceId): boolean {
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
