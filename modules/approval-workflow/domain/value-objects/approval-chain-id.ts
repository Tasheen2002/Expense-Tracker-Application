import { v4 as uuidv4 } from "uuid";

export class ApprovalChainId {
  private readonly value: string;

  private constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error("ApprovalChainId cannot be empty");
    }

    if (!this.isValidUuid(value)) {
      throw new Error("ApprovalChainId must be a valid UUID");
    }

    this.value = value;
  }

  static create(): ApprovalChainId {
    return new ApprovalChainId(uuidv4());
  }

  static fromString(value: string): ApprovalChainId {
    return new ApprovalChainId(value);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: ApprovalChainId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  private isValidUuid(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}
