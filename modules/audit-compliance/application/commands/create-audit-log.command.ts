import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';
import { AuditService, CreateAuditLogDTO } from '../services/audit.service';

export interface CreateAuditLogCommand extends ICommand {
  data: CreateAuditLogDTO;
}

export class CreateAuditLogHandler implements ICommandHandler<
  CreateAuditLogCommand,
  CommandResult<{ auditLogId: string }>
> {
  constructor(private readonly auditService: AuditService) {}

  async handle(
    input: CreateAuditLogCommand
  ): Promise<CommandResult<{ auditLogId: string }>> {
    try {
      const auditLog = await this.auditService.createAuditLog(input.data);
      return CommandResult.success({ auditLogId: auditLog.id.getValue() });
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
