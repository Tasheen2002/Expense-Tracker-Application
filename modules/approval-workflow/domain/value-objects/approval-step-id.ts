import { randomUUID } from "crypto";
import { UuidId } from "../../../../apps/api/src/shared/domain/value-objects";

export class ApprovalStepId extends UuidId {
  private constructor(value: string) {
    super(value, "ApprovalStepId");
  }

  static create(): ApprovalStepId {
    return new ApprovalStepId(randomUUID());
  }

  static fromString(id: string): ApprovalStepId {
    return new ApprovalStepId(id);
  }
}
