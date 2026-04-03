import { randomUUID } from "crypto";
import { UuidId } from '../../../../packages/core/src/domain/value-objects/uuid-id.base';

export class ExemptionId extends UuidId {
  private constructor(value: string) {
    super(value, "ExemptionId");
  }

  static create(): ExemptionId {
    return new ExemptionId(randomUUID());
  }

  static fromString(id: string): ExemptionId {
    return new ExemptionId(id);
  }
}
