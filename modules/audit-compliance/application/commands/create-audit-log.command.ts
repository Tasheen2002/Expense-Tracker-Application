import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';
import { AuditService, AuditLogDTO } from '../services/audit.service';

export interface CreateAuditLogCommand extends ICommand {
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

export class CreateAuditLogHandler implements ICommandHandler<
  CreateAuditLogCommand,
  CommandResult<AuditLogDTO>
> {
  constructor(private readonly auditService: AuditService) {}

  async handle(input: CreateAuditLogCommand): Promise<CommandResult<AuditLogDTO>> {
    const auditLog = await this.auditService.createAuditLog({
      workspaceId: input.workspaceId,
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      details: input.details,
      metadata: input.metadata,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });
    return CommandResult.success(auditLog);
  }
}
