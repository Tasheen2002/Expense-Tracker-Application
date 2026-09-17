import { ExemptionService } from '../services/exemption.service';
import { OperationService } from '@shared/services/operation.service';
import { PolicyExemptionDTO } from '../../domain/entities/policy-exemption.entity';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface ApproveExemptionCommand extends ICommand {
  readonly exemptionId: string;
  readonly workspaceId: string;
  readonly actorId: string;
  readonly approvedBy?: string;
  readonly approvalNote?: string;
  readonly authToken?: string;
}

export type ApproveExemptionInput = ApproveExemptionCommand;

export class ApproveExemptionHandler implements ICommandHandler<ApproveExemptionCommand, CommandResult<PolicyExemptionDTO>> {
  constructor(
    private readonly exemptionService: ExemptionService,
    private readonly operations: OperationService
  ) {}

  async handle(command: ApproveExemptionCommand): Promise<CommandResult<PolicyExemptionDTO>> {
    const actorId = command.actorId ?? command.approvedBy!;
    const dto = await this.operations.execute(
      {
        actorId,
        workspaceId: command.workspaceId,
        role: 'ADMIN',
        authToken: command.authToken,
      },
      async () =>
        this.exemptionService.approveExemption(
          command.exemptionId,
          command.workspaceId,
          actorId,
          command.approvalNote
        )
    );
    return CommandResult.success(dto);
  }
}
