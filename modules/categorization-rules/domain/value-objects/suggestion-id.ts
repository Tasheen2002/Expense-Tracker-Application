import { randomUUID } from "crypto";
import { UuidId } from '../../../../packages/core/src/domain/value-objects/uuid-id.base';

export class SuggestionId extends UuidId {
  private constructor(value: string) {
    super(value, "SuggestionId");
  }

  static create(): SuggestionId {
    return new SuggestionId(randomUUID());
  }

  static fromString(id: string): SuggestionId {
    return new SuggestionId(id);
  }
}
