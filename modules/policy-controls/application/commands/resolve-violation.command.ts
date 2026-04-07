import { ViolationService } from '../services/violation.service';
import { PolicyViolationDTO } from '../../domain/entities/policy-violation.entity';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface ResolveViolationInput {
  violationId: string;
  workspaceId: string;
  resolvedBy: string;
  resolutionNote?: string;
}

export class ResolveViolationHandler {
  constructor(private readonly violationService: ViolationService) {}

  async handle(input: ResolveViolationInput): Promise<CommandResult<PolicyViolationDTO>> {
    const dto = await this.violationService.resolveViolation(
      input.violationId,
      input.workspaceId,
      input.resolvedBy,
      input.resolutionNote,
    );
    return CommandResult.success(dto);
  }
}
