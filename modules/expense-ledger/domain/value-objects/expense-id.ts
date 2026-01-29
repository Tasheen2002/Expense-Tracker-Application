import { randomUUID } from "crypto";
import { UuidId } from "../../../../apps/api/src/shared/domain/value-objects";

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
