import { ExemptionService } from '../services/exemption.service';
import { PolicyExemptionDTO } from '../../domain/entities/policy-exemption.entity';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface RejectExemptionInput extends ICommand {
  readonly exemptionId: string;
  readonly workspaceId: string;
  readonly rejectedBy: string;
  readonly rejectionReason?: string;
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
