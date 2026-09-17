import { randomUUID } from 'crypto';
import { UuidId } from '@core/domain/value-objects/uuid-id.base';

export class BudgetId extends UuidId {
  private constructor(value: string) {
    super(value, 'BudgetId');
  }

  static create(): BudgetId {
    return new BudgetId(randomUUID());
  }

  static fromString(value: string): BudgetId {
    return new BudgetId(value);
  }
}
