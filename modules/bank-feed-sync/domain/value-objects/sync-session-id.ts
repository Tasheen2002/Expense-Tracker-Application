import { randomUUID } from 'crypto';
import { UuidId } from '../../../../packages/core/src/domain/value-objects/uuid-id.base';

export class SyncSessionId extends UuidId {
  private constructor(value: string) {
    super(value, 'SyncSessionId');
  }

  static create(): SyncSessionId {
    return new SyncSessionId(randomUUID());
  }

  static fromString(id: string): SyncSessionId {
    return new SyncSessionId(id);
  }
}
