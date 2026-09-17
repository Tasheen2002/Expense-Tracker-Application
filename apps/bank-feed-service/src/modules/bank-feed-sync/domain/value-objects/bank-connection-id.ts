import { randomUUID } from 'crypto';
import { UuidId } from '@core/domain/value-objects/uuid-id.base';

export class BankConnectionId extends UuidId {
  private constructor(value: string) {
    super(value, 'BankConnectionId');
  }

  static create(): BankConnectionId {
    return new BankConnectionId(randomUUID());
  }

  static fromString(id: string): BankConnectionId {
    return new BankConnectionId(id);
  }
}
