import { AuditService } from "../services/audit.service";
import { AuditLog } from "../../domain/entities/audit-log.entity";

export class GetEntityAuditHistoryQuery {
  constructor(
    public readonly workspaceId: string,
    public readonly entityType: string,
    public readonly entityId: string,
  ) {}
}

export class GetEntityAuditHistoryHandler {
  constructor(private readonly auditService: AuditService) {}

  async handle(query: GetEntityAuditHistoryQuery): Promise<AuditLog[]> {
    return await this.auditService.getEntityAuditHistory(
      query.workspaceId,
      query.entityType,
      query.entityId,
    );
  }
}
