import { randomUUID } from "crypto";
import { UuidId } from '@core/domain/value-objects/uuid-id.base';

export class SplitParticipantId extends UuidId {
  private constructor(value: string) {
    super(value, "SplitParticipantId");
  }

  static create(): SplitParticipantId {
    return new SplitParticipantId(randomUUID());
  }

  static fromString(id: string): SplitParticipantId {
    return new SplitParticipantId(id);
  }
}
