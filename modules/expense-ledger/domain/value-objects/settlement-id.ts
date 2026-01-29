import { randomUUID } from "crypto";
import { UuidId } from "../../../../apps/api/src/shared/domain/value-objects";

export class SettlementId extends UuidId {
  private constructor(value: string) {
    super(value, "SettlementId");
  }

  static create(): SettlementId {
    return new SettlementId(randomUUID());
  }

  static fromString(id: string): SettlementId {
    return new SettlementId(id);
  }
}
