import { randomUUID } from 'crypto';
import { UuidId } from '../../../../packages/core/src/domain/value-objects/uuid-id.base';

export class SupplierId extends UuidId {
  private constructor(value: string) {
    super(value, 'SupplierId');
  }

  static create(): SupplierId {
    return new SupplierId(randomUUID());
  }

  static fromString(value: string): SupplierId {
    return new SupplierId(value);
  }
}
