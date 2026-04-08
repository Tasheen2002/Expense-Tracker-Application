import { randomUUID } from 'crypto';
import { UuidId } from '../../../../packages/core/src/domain/value-objects/uuid-id.base';

export class PurchaseOrderItemId extends UuidId {
  private constructor(value: string) {
    super(value, 'PurchaseOrderItemId');
  }

  static create(): PurchaseOrderItemId {
    return new PurchaseOrderItemId(randomUUID());
  }

  static fromString(value: string): PurchaseOrderItemId {
    return new PurchaseOrderItemId(value);
  }
}
