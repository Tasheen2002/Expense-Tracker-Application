import { randomUUID } from "crypto";
import { UuidId } from "../../../../apps/api/src/shared/domain/value-objects";

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
