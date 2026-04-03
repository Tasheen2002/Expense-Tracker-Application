import { randomUUID } from "crypto";
import { UuidId } from '../../../../packages/core/src/domain/value-objects/uuid-id.base';

export class ScenarioId extends UuidId {
  private constructor(value: string) {
    super(value, "ScenarioId");
  }

  static create(): ScenarioId {
    return new ScenarioId(randomUUID());
  }

  static fromString(id: string): ScenarioId {
    return new ScenarioId(id);
  }
}
