import { randomUUID } from "crypto";
import { UuidId } from '../../../../packages/core/src/domain/value-objects/uuid-id.base';

export class ProjectId extends UuidId {
  private constructor(value: string) {
    super(value, "ProjectId");
  }

  static create(): ProjectId {
    return new ProjectId(randomUUID());
  }

  static fromString(id: string): ProjectId {
    return new ProjectId(id);
  }
}
