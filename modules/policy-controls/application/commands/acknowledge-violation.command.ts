import { ViolationRepository } from '../../domain/repositories/violation.repository';
import { PolicyViolation } from '../../domain/entities/policy-violation.entity';
import { ViolationId } from '../../domain/value-objects/violation-id';
import { ViolationNotFoundError } from '../../domain/errors/policy-controls.errors';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface AcknowledgeViolationInput {
  violationId: string;
  workspaceId: string;
  acknowledgedBy: string;
}

export class AcknowledgeViolationHandler {
  constructor(private readonly violationRepository: ViolationRepository) {}

  async handle(input: AcknowledgeViolationInput): Promise<CommandResult<void>> {
    const violation = await this.violationRepository.findById(
      ViolationId.fromString(input.violationId)
    );
    if (
      !violation ||
      violation.getWorkspaceId().getValue() !== input.workspaceId
    ) {
      throw new ViolationNotFoundError(input.violationId);
    }

    violation.acknowledge(input.acknowledgedBy);
    await this.violationRepository.save(violation);

    return CommandResult.success();
  }
}
