import { randomUUID } from "crypto";
import { UuidId } from "../../../../apps/api/src/shared/domain/value-objects";

export class BudgetId extends UuidId {
  private constructor(value: string) {
    super(value, "BudgetId");
  }

  static create(): BudgetId {
    return new BudgetId(randomUUID());
  }

  static fromString(value: string): BudgetId {
    return new BudgetId(value);
  }
}
