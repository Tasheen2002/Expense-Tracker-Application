import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from "../../../../apps/api/src/shared/application";
import { AuditLogDTO } from "../../domain/entities/audit-log.entity";
import { AuditService, CreateAuditLogDTO } from "../services/audit.service";

export interface CreateAuditLogCommand extends ICommand {
  data: CreateAuditLogDTO;
}

export class CreateAuditLogHandler
  implements
    ICommandHandler<CreateAuditLogCommand, CommandResult<AuditLogDTO>>
{
  constructor(private readonly auditService: AuditService) {}

  async handle(
    input: CreateAuditLogCommand,
  ): Promise<CommandResult<AuditLogDTO>> {
    try {
      const auditLog = await this.auditService.createAuditLog(input.data);
      return CommandResult.success(auditLog.toJSON());
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
