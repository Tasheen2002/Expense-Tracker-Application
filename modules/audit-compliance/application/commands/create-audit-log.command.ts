import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';
import { AuditService, CreateAuditLogDTO, AuditLogDTO } from '../services/audit.service';

export interface CreateAuditLogCommand extends ICommand {
  data: CreateAuditLogDTO;
}

export class CreateAuditLogHandler implements ICommandHandler<
  CreateAuditLogCommand,
  CommandResult<AuditLogDTO>
> {
  constructor(private readonly auditService: AuditService) {}

  async handle(input: CreateAuditLogCommand): Promise<CommandResult<AuditLogDTO>> {
    const auditLog = await this.auditService.createAuditLog(input.data);
    return CommandResult.success(auditLog);
  }
}
