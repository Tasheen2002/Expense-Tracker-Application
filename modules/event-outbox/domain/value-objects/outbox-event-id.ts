import { randomUUID } from 'crypto';
import { UuidId } from '../../../../packages/core/src/domain/value-objects/uuid-id.base';

export class OutboxEventId extends UuidId {
  private constructor(value: string) {
    super(value, 'OutboxEventId');
  }

  static create(): OutboxEventId {
    return new OutboxEventId(randomUUID());
  }

  static fromString(id: string): OutboxEventId {
    return new OutboxEventId(id);
  }
}
