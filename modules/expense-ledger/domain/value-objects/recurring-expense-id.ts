import { randomUUID } from "crypto";
import { UuidId } from '../../../../packages/core/src/domain/value-objects/uuid-id.base';

export class RecurringExpenseId extends UuidId {
  private constructor(value: string) {
    super(value, "RecurringExpenseId");
  }

  static create(): RecurringExpenseId {
    return new RecurringExpenseId(randomUUID());
  }

  static fromString(id: string): RecurringExpenseId {
    return new RecurringExpenseId(id);
  }
}
