import { randomUUID } from "crypto";
import { UuidId } from '@core/domain/value-objects/uuid-id.base';

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
