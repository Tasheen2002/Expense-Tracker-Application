import { ExemptionService } from '../services/exemption.service';
import { PolicyExemptionDTO } from '../../domain/entities/policy-exemption.entity';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface ApproveExemptionInput {
  exemptionId: string;
  workspaceId: string;
  approvedBy: string;
}

export class ApproveExemptionHandler {
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
