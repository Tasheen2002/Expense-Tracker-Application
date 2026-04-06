import { randomUUID } from 'crypto';
import { UuidId } from '../../../../packages/core/src/domain/value-objects/uuid-id.base';

export class ApprovalChainId extends UuidId {
  private constructor(value: string) {
    super(value, 'ApprovalChainId');
  }

  static create(): ApprovalChainId {
    return new ApprovalChainId(randomUUID());
  }

  static fromString(id: string): ApprovalChainId {
    return new ApprovalChainId(id);
  }
}
