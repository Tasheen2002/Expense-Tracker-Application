import { randomUUID } from "crypto";
import { UuidId } from '../../../../packages/core/src/domain/value-objects/uuid-id.base';

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
