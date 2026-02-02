import { InvalidAuditResourceError } from "../errors/audit.errors";

export interface ResourceProps {
  entityType: string;
  entityId: string;
}

export class AuditResource {
  private readonly props: ResourceProps;

  private constructor(props: ResourceProps) {
    this.props = props;
  }

  static create(entityType: string, entityId: string): AuditResource {
    if (!entityType || entityType.trim().length === 0) {
      throw new InvalidAuditResourceError("Entity type is required");
    }
    if (!entityId || entityId.trim().length === 0) {
      throw new InvalidAuditResourceError("Entity ID is required");
    }

    return new AuditResource({
      entityType: entityType.trim(),
      entityId: entityId.trim(),
    });
  }

  get entityType(): string {
    return this.props.entityType;
  }

  get entityId(): string {
    return this.props.entityId;
  }
}
