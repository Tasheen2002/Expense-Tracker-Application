import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';
import { AuditService } from '../services/audit.service';

export interface PurgeAuditLogsCommand extends ICommand {
  readonly workspaceId: string;
  readonly olderThanDays: number;
  readonly purgedBy: string;
}

export class PurgeAuditLogsHandler implements ICommandHandler<
  PurgeAuditLogsCommand,
  CommandResult<{ readonly deletedCount: number }>
> {
  constructor(private readonly auditService: AuditService) {}

  async handle(
    command: PurgeAuditLogsCommand
  ): Promise<CommandResult<{ readonly deletedCount: number }>> {
    const deletedCount = await this.auditService.purgeOldLogs(
      command.workspaceId,
      command.olderThanDays,
      command.purgedBy
    );
    return CommandResult.success({ deletedCount });
  }
}
