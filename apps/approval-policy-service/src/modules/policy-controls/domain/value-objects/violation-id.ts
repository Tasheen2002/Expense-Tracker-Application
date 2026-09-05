import { randomUUID } from "crypto";
import { UuidId } from '@core/domain/value-objects/uuid-id.base';

export class ViolationId extends UuidId {
  private constructor(value: string) {
    super(value, "ViolationId");
  }

  static create(): ViolationId {
    return new ViolationId(randomUUID());
  }

  static fromString(id: string): ViolationId {
    return new ViolationId(id);
  }
}
