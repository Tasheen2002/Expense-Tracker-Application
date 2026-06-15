import { ExemptionService } from '../services/exemption.service';
import { PolicyExemptionDTO } from '../../domain/entities/policy-exemption.entity';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface ApproveExemptionInput extends ICommand {
  readonly exemptionId: string;
  readonly workspaceId: string;
  readonly approvedBy: string;
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
