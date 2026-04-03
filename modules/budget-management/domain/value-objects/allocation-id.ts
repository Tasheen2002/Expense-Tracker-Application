import { randomUUID } from 'crypto';
import { UuidId } from '../../../../packages/core/src/domain/value-objects/uuid-id.base';

export class AllocationId extends UuidId {
  private constructor(value: string) {
    super(value, 'AllocationId');
  }

  static create(): AllocationId {
    return new AllocationId(randomUUID());
  }

  static fromString(value: string): AllocationId {
    return new AllocationId(value);
  }
}
