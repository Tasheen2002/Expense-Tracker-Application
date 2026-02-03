import { AuditService } from "../services/audit.service";
import { AuditLog } from "../../domain/entities/audit-log.entity";

export interface CreateAuditLogDTO {
  workspaceId: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export class CreateAuditLogCommand {
  constructor(public readonly data: CreateAuditLogDTO) {}
}

export class CreateAuditLogHandler {
  constructor(private readonly auditService: AuditService) {}

  async handle(command: CreateAuditLogCommand): Promise<AuditLog> {
    return await this.auditService.createAuditLog(command.data);
  }
}
