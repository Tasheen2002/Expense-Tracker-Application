import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';
import { AuditService, CreateAuditLogDTO } from '../services/audit.service';

export interface CreateAuditLogCommand extends ICommand {
  data: CreateAuditLogDTO;
}

export class CreateAuditLogHandler implements ICommandHandler<
  CreateAuditLogCommand,
  CommandResult<string>
> {
  constructor(private readonly auditService: AuditService) {}

  async handle(input: CreateAuditLogCommand): Promise<CommandResult<string>> {
    try {
      const auditLog = await this.auditService.createAuditLog(input.data);
      return CommandResult.success(auditLog.id.getValue());
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
