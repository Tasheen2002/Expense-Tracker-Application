import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';
import { AuditService } from '../services/audit.service';

export interface PurgeAuditLogsCommand extends ICommand {
  workspaceId: string;
  olderThanDays: number;
}

export class PurgeAuditLogsHandler implements ICommandHandler<
  PurgeAuditLogsCommand,
  CommandResult<{ deletedCount: number }>
> {
  constructor(private readonly auditService: AuditService) {}

  async handle(
    input: PurgeAuditLogsCommand,
  ): Promise<CommandResult<{ deletedCount: number }>> {
    try {
      const deletedCount = await this.auditService.purgeOldLogs(
        input.workspaceId,
        input.olderThanDays,
      );
      return CommandResult.success({ deletedCount });
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
