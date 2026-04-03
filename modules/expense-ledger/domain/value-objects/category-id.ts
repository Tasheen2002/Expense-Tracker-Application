import { randomUUID } from "crypto";
import { UuidId } from '../../../../packages/core/src/domain/value-objects/uuid-id.base';

export class CategoryId extends UuidId {
  private constructor(value: string) {
    super(value, "CategoryId");
  }

  static create(): CategoryId {
    return new CategoryId(randomUUID());
  }

  static fromString(id: string): CategoryId {
    return new CategoryId(id);
  }
}
