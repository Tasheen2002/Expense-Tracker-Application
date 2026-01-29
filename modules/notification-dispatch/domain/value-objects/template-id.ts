import { randomUUID } from "crypto";
import { UuidId } from "../../../../apps/api/src/shared/domain/value-objects";

export class TemplateId extends UuidId {
  private constructor(value: string) {
    super(value, "TemplateId");
  }

  static create(): TemplateId {
    return new TemplateId(randomUUID());
  }

  static fromString(id: string): TemplateId {
    return new TemplateId(id);
  }
}
