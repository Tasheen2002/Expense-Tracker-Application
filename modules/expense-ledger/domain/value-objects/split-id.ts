import { randomUUID } from "crypto";
import { UuidId } from '../../../../packages/core/src/domain/value-objects/uuid-id.base';

export class SplitId extends UuidId {
  private constructor(value: string) {
    super(value, "SplitId");
  }

  static create(): SplitId {
    return new SplitId(randomUUID());
  }

  static fromString(id: string): SplitId {
    return new SplitId(id);
  }
}
