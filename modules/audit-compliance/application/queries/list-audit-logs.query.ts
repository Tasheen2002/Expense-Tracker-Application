import { AuditService } from "../services/audit.service";
import { PaginatedResult } from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";
import { AuditLog } from "../../domain/entities/audit-log.entity";

export interface ListAuditLogsFilters {
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
}

export class ListAuditLogsQuery {
  constructor(
    public readonly workspaceId: string,
    public readonly filters?: ListAuditLogsFilters,
    public readonly limit: number = 50,
    public readonly offset: number = 0,
  ) {}
}

export class ListAuditLogsHandler {
  constructor(private readonly auditService: AuditService) {}

  async handle(query: ListAuditLogsQuery): Promise<PaginatedResult<AuditLog>> {
    return await this.auditService.listAuditLogs(
      query.workspaceId,
      query.filters,
      query.limit,
      query.offset,
    );
  }
}
