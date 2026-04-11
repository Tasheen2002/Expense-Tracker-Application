import { ExemptionService } from '../services/exemption.service';
import { PolicyExemptionDTO } from '../../domain/entities/policy-exemption.entity';
import { ICommand, ICommandHandler } from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface RequestExemptionInput extends ICommand {
  workspaceId: string;
  policyId: string;
  userId: string;
  requestedBy: string;
  reason: string;
  startDate: Date;
  endDate: Date;
}

export class RequestExemptionHandler implements ICommandHandler<RequestExemptionInput, CommandResult<PolicyExemptionDTO>> {
  constructor(private readonly exemptionService: ExemptionService) {}

  async handle(
    input: RequestExemptionInput
  ): Promise<CommandResult<PolicyExemptionDTO>> {
    const dto = await this.exemptionService.requestExemption(input);
    return CommandResult.success(dto);
  }
}
