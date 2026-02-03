import { AuditService } from "../services/audit.service";
import { AuditLog } from "../../domain/entities/audit-log.entity";

export class GetAuditLogQuery {
  constructor(
    public readonly workspaceId: string,
    public readonly auditLogId: string,
  ) {}
}

export class GetAuditLogHandler {
  constructor(private readonly auditService: AuditService) {}

  async handle(query: GetAuditLogQuery): Promise<AuditLog | null> {
    return await this.auditService.getAuditLogById(
      query.workspaceId,
      query.auditLogId,
    );
  }
}
