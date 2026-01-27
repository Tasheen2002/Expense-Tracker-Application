import { v4 as uuidv4 } from 'uuid'

export class ApprovalStepId {
  private readonly value: string

  private constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('ApprovalStepId cannot be empty')
    }

    if (!this.isValidUuid(value)) {
      throw new Error('ApprovalStepId must be a valid UUID')
    }

    this.value = value
  }

  static create(): ApprovalStepId {
    return new ApprovalStepId(uuidv4())
  }

  static fromString(value: string): ApprovalStepId {
    return new ApprovalStepId(value)
  }

  getValue(): string {
    return this.value
  }

  equals(other: ApprovalStepId): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }

  private isValidUuid(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  }
}
