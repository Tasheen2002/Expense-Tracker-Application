import { randomUUID } from 'crypto';
import { UuidId } from '../../../../packages/core/src/domain/value-objects/uuid-id.base';

export class WorkflowId extends UuidId {
  private constructor(value: string) {
    super(value, 'WorkflowId');
  }

  static create(): WorkflowId {
    return new WorkflowId(randomUUID());
  }

  static fromString(id: string): WorkflowId {
    return new WorkflowId(id);
  }
}
