import { randomUUID } from "crypto";
import { UuidId } from '@core/domain/value-objects/uuid-id.base';

export class DepartmentId extends UuidId {
  private constructor(value: string) {
    super(value, "DepartmentId");
  }

  static create(): DepartmentId {
    return new DepartmentId(randomUUID());
  }

  static fromString(id: string): DepartmentId {
    return new DepartmentId(id);
  }
}
