import { ViolationService } from '../services/violation.service';
import { PolicyViolationDTO } from '../../domain/entities/policy-violation.entity';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface OverrideViolationInput {
  violationId: string;
  workspaceId: string;
  overriddenBy: string;
  overrideReason: string;
}

export class OverrideViolationHandler {
  constructor(private readonly violationService: ViolationService) {}

  async handle(input: OverrideViolationInput): Promise<CommandResult<PolicyViolationDTO>> {
    const dto = await this.violationService.overrideViolation(
      input.violationId,
      input.workspaceId,
      input.overriddenBy,
      input.overrideReason,
    );
    return CommandResult.success(dto);
  }
}
