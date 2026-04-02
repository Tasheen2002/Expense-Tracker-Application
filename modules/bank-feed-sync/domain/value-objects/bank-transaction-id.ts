import { randomUUID } from 'crypto';
import { UuidId } from '../../../../packages/core/src/domain/value-objects/uuid-id.base';

export class BankTransactionId extends UuidId {
  private constructor(value: string) {
    super(value, 'BankTransactionId');
  }

  static create(): BankTransactionId {
    return new BankTransactionId(randomUUID());
  }

  static fromString(id: string): BankTransactionId {
    return new BankTransactionId(id);
  }
}
