import { ViolationRepository } from '../../domain/repositories/violation.repository';
import { PolicyViolation } from '../../domain/entities/policy-violation.entity';
import { ViolationId } from '../../domain/value-objects/violation-id';
import { ViolationNotFoundError } from '../../domain/errors/policy-controls.errors';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface OverrideViolationInput {
  violationId: string;
  workspaceId: string;
  overriddenBy: string;
  overrideReason: string;
}

export class OverrideViolationHandler {
  constructor(private readonly violationRepository: ViolationRepository) {}

  async handle(input: OverrideViolationInput): Promise<CommandResult<void>> {
    const violation = await this.violationRepository.findById(
      ViolationId.fromString(input.violationId)
    );
    if (
      !violation ||
      violation.getWorkspaceId().getValue() !== input.workspaceId
    ) {
      throw new ViolationNotFoundError(input.violationId);
    }

    violation.override(input.overriddenBy, input.overrideReason);
    await this.violationRepository.save(violation);

    return CommandResult.success();
  }
}
