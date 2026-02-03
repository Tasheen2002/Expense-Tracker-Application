import { AuditService } from "../services/audit.service";
import { PaginatedAuditLogs } from "../../domain/repositories/audit-log.repository";

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

  async handle(query: ListAuditLogsQuery): Promise<PaginatedAuditLogs> {
    return await this.auditService.listAuditLogs(
      query.workspaceId,
      query.filters,
      query.limit,
      query.offset,
    );
  }
}
