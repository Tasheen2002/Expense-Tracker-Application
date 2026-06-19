import { randomUUID } from 'crypto';
import { UuidId } from '@core/domain/value-objects/uuid-id.base';

export class AggregateId extends UuidId {
  private constructor(value: string) {
    super(value, 'AggregateId');
  }

  static create(): AggregateId {
    return new AggregateId(randomUUID());
  }

  static fromString(value: string): AggregateId {
    return new AggregateId(value);
  }
}
