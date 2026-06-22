import { ExemptionService } from '../services/exemption.service';
import { PolicyExemptionDTO } from '../../domain/entities/policy-exemption.entity';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface RequestExemptionInput extends ICommand {
  readonly workspaceId: string;
  readonly policyId: string;
  readonly userId: string;
  readonly requestedBy: string;
  readonly reason: string;
  readonly startDate: Date;
  readonly endDate: Date;
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
