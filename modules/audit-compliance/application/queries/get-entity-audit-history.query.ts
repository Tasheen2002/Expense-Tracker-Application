import { AuditService } from "../services/audit.service";
import { AuditLog } from "../../domain/entities/audit-log.entity";
import { PaginatedResult } from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export class GetEntityAuditHistoryQuery {
  constructor(
    public readonly workspaceId: string,
    public readonly entityType: string,
    public readonly entityId: string,
    public readonly limit?: number,
    public readonly offset?: number,
  ) {}
}

export class GetEntityAuditHistoryHandler {
  constructor(private readonly auditService: AuditService) {}

  async handle(query: GetEntityAuditHistoryQuery): Promise<PaginatedResult<AuditLog>> {
    const options = {
      limit: query.limit,
      offset: query.offset,
    };

    return await this.auditService.getEntityAuditHistory(
      query.workspaceId,
      query.entityType,
      query.entityId,
      options,
    );
  }
}
