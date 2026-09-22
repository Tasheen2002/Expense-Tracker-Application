import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';
import { AuditService, AuditLogDTO } from '../services/audit.service';

export interface CreateAuditLogCommand extends ICommand {
  readonly workspaceId: string;
  readonly userId: string | null;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly details?: Record<string, unknown>;
  readonly metadata?: Record<string, unknown>;
  readonly ipAddress?: string;
  readonly userAgent?: string;
}

export class CreateAuditLogHandler implements ICommandHandler<
  CreateAuditLogCommand,
  CommandResult<AuditLogDTO>
> {
  constructor(private readonly auditService: AuditService) {}

  async handle(command: CreateAuditLogCommand): Promise<CommandResult<AuditLogDTO>> {
    const auditLog = await this.auditService.createAuditLog({
      workspaceId: command.workspaceId,
      userId: command.userId,
      action: command.action,
      entityType: command.entityType,
      entityId: command.entityId,
      details: command.details,
      metadata: command.metadata,
      ipAddress: command.ipAddress,
      userAgent: command.userAgent,
    });
    return CommandResult.success(auditLog);
  }
}
