import { v4 as uuidv4 } from "uuid";

export class ApprovalChainId {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(): ApprovalChainId {
    return new ApprovalChainId(uuidv4());
  }

  static fromString(value: string): ApprovalChainId {
    if (!value || value.trim().length === 0) {
      throw new Error("ApprovalChainId cannot be empty");
    }
    return new ApprovalChainId(value);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: ApprovalChainId): boolean {
    return this.value === other.value;
  }
}
