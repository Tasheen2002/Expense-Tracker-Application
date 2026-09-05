import { randomUUID } from 'crypto';
import { UuidId } from '@core/domain/value-objects/uuid-id.base';

export class InventoryTransactionId extends UuidId {
  private constructor(value: string) {
    super(value, 'InventoryTransactionId');
  }

  static create(): InventoryTransactionId {
    return new InventoryTransactionId(randomUUID());
  }

  static fromString(value: string): InventoryTransactionId {
    return new InventoryTransactionId(value);
  }
}
