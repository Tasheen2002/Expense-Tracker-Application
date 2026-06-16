import { AuditService } from "../services/audit.service";
import { AuditLog } from "../../domain/entities/audit-log.entity";
import { ICommand, ICommandHandler, CommandResult } from "../../../../packages/core/src/application/cqrs";

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

export class CreateAuditLogHandler
  implements ICommandHandler<CreateAuditLogCommand, CommandResult<AuditLog>>
{
  constructor(private readonly auditService: AuditService) {}

  async handle(command: CreateAuditLogCommand): Promise<CommandResult<AuditLog>> {
    try {
      const auditLog = await this.auditService.createAuditLog(command);
      return CommandResult.success<AuditLog>(auditLog);
    } catch (error) {
      return CommandResult.failure<AuditLog>(
        error instanceof Error ? error.message : 'Failed to create audit log'
      );
    }
  }
}
