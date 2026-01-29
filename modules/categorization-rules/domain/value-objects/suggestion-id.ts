import { randomUUID } from "crypto";
import { UuidId } from "../../../../apps/api/src/shared/domain/value-objects";

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
