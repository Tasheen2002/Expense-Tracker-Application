import { randomUUID } from 'crypto';
import { UuidId } from '@core/domain/value-objects/uuid-id.base';

export class PurchaseOrderId extends UuidId {
  private constructor(value: string) {
    super(value, 'PurchaseOrderId');
  }

  static create(): PurchaseOrderId {
    return new PurchaseOrderId(randomUUID());
  }

  static fromString(value: string): PurchaseOrderId {
    return new PurchaseOrderId(value);
  }
}
