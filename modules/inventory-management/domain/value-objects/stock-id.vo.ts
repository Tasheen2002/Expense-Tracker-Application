import { randomUUID } from 'crypto';
import { UuidId } from '../../../../packages/core/src/domain/value-objects/uuid-id.base';

export class StockId extends UuidId {
  private constructor(value: string) {
    super(value, 'StockId');
  }

  static create(): StockId {
    return new StockId(randomUUID());
  }

  static fromString(value: string): StockId {
    return new StockId(value);
  }
}
