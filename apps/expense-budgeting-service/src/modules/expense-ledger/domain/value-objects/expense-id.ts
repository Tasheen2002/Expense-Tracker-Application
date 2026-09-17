import { randomUUID } from "crypto";
import { UuidId } from '@core/domain/value-objects/uuid-id.base';

export class ExpenseId extends UuidId {
  private constructor(value: string) {
    super(value, "ExpenseId");
  }

  static create(): ExpenseId {
    return new ExpenseId(randomUUID());
  }

  static fromString(id: string): ExpenseId {
    return new ExpenseId(id);
  }
}
