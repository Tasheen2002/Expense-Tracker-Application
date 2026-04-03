import { randomUUID } from 'crypto';
import { UuidId } from '../../../../packages/core/src/domain/value-objects/uuid-id.base';

export class SpendingLimitId extends UuidId {
  private constructor(value: string) {
    super(value, 'SpendingLimitId');
  }

  static create(): SpendingLimitId {
    return new SpendingLimitId(randomUUID());
  }

  static fromString(value: string): SpendingLimitId {
    return new SpendingLimitId(value);
  }
}
