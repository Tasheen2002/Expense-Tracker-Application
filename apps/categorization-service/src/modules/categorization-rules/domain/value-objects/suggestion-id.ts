import { randomUUID } from "crypto";
import { UuidId } from '@core/domain/value-objects/uuid-id.base';

export class SuggestionId extends UuidId {
  declare private readonly nominalBrand: SuggestionId;
  private constructor(value: string) {
    super(value, "SuggestionId");
    Object.freeze(this);
  }

  static create(): SuggestionId {
    return new SuggestionId(randomUUID());
  }

  static fromString(id: string): SuggestionId {
    return new SuggestionId(id);
  }
}
