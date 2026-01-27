import { randomUUID } from 'crypto'

export class WorkflowId {
  private readonly value: string

  private constructor(value: string) {
    this.value = value
  }

  static create(): WorkflowId {
    return new WorkflowId(randomUUID())
  }

  static fromString(id: string): WorkflowId {
    if (!this.isValid(id)) {
      throw new Error('Invalid workflow ID format')
    }
    return new WorkflowId(id)
  }

  static isValid(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(id)
  }

  getValue(): string {
    return this.value
  }

  equals(other: WorkflowId): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
