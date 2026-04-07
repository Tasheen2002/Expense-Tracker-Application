import { ViolationService } from '../services/violation.service';
import { PolicyViolationDTO } from '../../domain/entities/policy-violation.entity';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface AcknowledgeViolationInput {
  violationId: string;
  workspaceId: string;
  acknowledgedBy: string;
}

export class AcknowledgeViolationHandler {
  constructor(private readonly violationService: ViolationService) {}

  async handle(input: AcknowledgeViolationInput): Promise<CommandResult<PolicyViolationDTO>> {
    const dto = await this.violationService.acknowledgeViolation(
      input.violationId,
      input.workspaceId,
      input.acknowledgedBy,
    );
    return CommandResult.success(dto);
  }
}
