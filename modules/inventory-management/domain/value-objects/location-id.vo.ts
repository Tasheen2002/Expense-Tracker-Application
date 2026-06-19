import { randomUUID } from 'crypto';
import { UuidId } from '@core/domain/value-objects/uuid-id.base';

export class LocationId extends UuidId {
  private constructor(value: string) {
    super(value, 'LocationId');
  }

  static create(): LocationId {
    return new LocationId(randomUUID());
  }

  static fromString(value: string): LocationId {
    return new LocationId(value);
  }
}
