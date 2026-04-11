import { ExemptionService } from '../services/exemption.service';
import { PolicyExemptionDTO } from '../../domain/entities/policy-exemption.entity';
import { ICommand, ICommandHandler } from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface RejectExemptionInput extends ICommand {
  exemptionId: string;
  workspaceId: string;
  rejectedBy: string;
  rejectionReason?: string;
}

export class RejectExemptionHandler implements ICommandHandler<RejectExemptionInput, CommandResult<PolicyExemptionDTO>> {
  constructor(private readonly exemptionService: ExemptionService) {}

  async handle(input: RejectExemptionInput): Promise<CommandResult<PolicyExemptionDTO>> {
    const dto = await this.exemptionService.rejectExemption(
      input.exemptionId,
      input.workspaceId,
      input.rejectedBy,
      input.rejectionReason,
    );
    return CommandResult.success(dto);
  }
}
