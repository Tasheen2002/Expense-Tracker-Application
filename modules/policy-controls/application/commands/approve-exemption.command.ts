import { ExemptionService } from '../services/exemption.service';
import { PolicyExemptionDTO } from '../../domain/entities/policy-exemption.entity';
import { ICommand, ICommandHandler } from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface ApproveExemptionInput extends ICommand {
  exemptionId: string;
  workspaceId: string;
  approvedBy: string;
}

export class ApproveExemptionHandler implements ICommandHandler<ApproveExemptionInput, CommandResult<PolicyExemptionDTO>> {
  constructor(private readonly exemptionService: ExemptionService) {}

  async handle(input: ApproveExemptionInput): Promise<CommandResult<PolicyExemptionDTO>> {
    const dto = await this.exemptionService.approveExemption(
      input.exemptionId,
      input.workspaceId,
      input.approvedBy,
    );
    return CommandResult.success(dto);
  }
}
