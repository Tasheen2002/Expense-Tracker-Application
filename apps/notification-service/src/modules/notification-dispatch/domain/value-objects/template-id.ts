import { randomUUID } from "crypto";
import { UuidId } from '@core/domain/value-objects/uuid-id.base';

export class TemplateId extends UuidId {
  declare private readonly templateIdBrand: void;
  private constructor(value: string) {
    super(value, "TemplateId");
    Object.freeze(this);
  }

  static create(): TemplateId {
    return new TemplateId(randomUUID());
  }

  static fromString(id: string): TemplateId {
    return new TemplateId(id);
  }
}
