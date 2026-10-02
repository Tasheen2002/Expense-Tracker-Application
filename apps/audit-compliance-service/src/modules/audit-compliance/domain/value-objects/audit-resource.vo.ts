import { InvalidAuditResourceError } from "../errors/audit.errors";

export interface ResourceProps {
  entityType: string;
  entityId: string;
}

export class AuditResource {
  private static readonly UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  private readonly props: ResourceProps;

  private constructor(props: ResourceProps) {
    this.props = props;
  }

  static create(entityType: string, entityId: string): AuditResource {
    if (!entityType || entityType.trim().length === 0 || entityType.trim().length > 100) {
      throw new InvalidAuditResourceError('Entity type must contain 1 to 100 characters');
    }
    if (!entityId || !AuditResource.UUID_PATTERN.test(entityId)) {
      throw new InvalidAuditResourceError('Entity ID must be a UUID');
    }

    return new AuditResource({
      entityType: entityType.trim(),
      entityId: entityId.trim(),
    });
  }

  static fromPersistence(entityType: string, entityId: string): AuditResource {
    return new AuditResource({ entityType, entityId });
  }

  get entityType(): string {
    return this.props.entityType;
  }

  get entityId(): string {
    return this.props.entityId;
  }
}
