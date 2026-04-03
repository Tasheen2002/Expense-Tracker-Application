import { randomUUID } from "crypto";
import { UuidId } from '../../../../packages/core/src/domain/value-objects/uuid-id.base';

export class CostCenterId extends UuidId {
  private constructor(value: string) {
    super(value, "CostCenterId");
  }

  static create(): CostCenterId {
    return new CostCenterId(randomUUID());
  }

  static fromString(id: string): CostCenterId {
    return new CostCenterId(id);
  }
}
