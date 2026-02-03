import { randomUUID } from "crypto";
import { UuidId } from "../../../../apps/api/src/shared/domain/value-objects";

export class BankTransactionId extends UuidId {
  private constructor(value: string) {
    super(value, "BankTransactionId");
  }

  static create(): BankTransactionId {
    return new BankTransactionId(randomUUID());
  }

  static fromString(id: string): BankTransactionId {
    return new BankTransactionId(id);
  }
}
