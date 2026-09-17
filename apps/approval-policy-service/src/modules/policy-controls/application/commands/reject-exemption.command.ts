import { ExemptionService } from '../services/exemption.service';
import { OperationService } from '@shared/services/operation.service';
import { PolicyExemptionDTO } from '../../domain/entities/policy-exemption.entity';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface RejectExemptionCommand extends ICommand {
  readonly exemptionId: string;
  readonly workspaceId: string;
  readonly actorId: string;
  readonly rejectedBy?: string;
  readonly rejectionReason: string;
  readonly authToken?: string;
}

export type RejectExemptionInput = RejectExemptionCommand;

export class RejectExemptionHandler implements ICommandHandler<RejectExemptionCommand, CommandResult<PolicyExemptionDTO>> {
  constructor(
    private readonly exemptionService: ExemptionService,
    private readonly operations: OperationService
  ) {}

  async handle(command: RejectExemptionCommand): Promise<CommandResult<PolicyExemptionDTO>> {
    const actorId = command.actorId ?? command.rejectedBy!;
    const dto = await this.operations.execute(
      {
        actorId,
        workspaceId: command.workspaceId,
        role: 'ADMIN',
        authToken: command.authToken,
      },
      async () =>
        this.exemptionService.rejectExemption(
          command.exemptionId,
          command.workspaceId,
          actorId,
          command.rejectionReason
        )
    );
    return CommandResult.success(dto);
  }
}
