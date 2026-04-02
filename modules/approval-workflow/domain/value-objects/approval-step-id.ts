import { randomUUID } from 'crypto';
import { UuidId } from '../../../../packages/core/src/domain/value-objects/uuid-id.base';

export class ApprovalStepId extends UuidId {
  private constructor(value: string) {
    super(value, 'ApprovalStepId');
  }

  static create(): ApprovalStepId {
    return new ApprovalStepId(randomUUID());
  }

  static fromString(id: string): ApprovalStepId {
    return new ApprovalStepId(id);
  }
}
