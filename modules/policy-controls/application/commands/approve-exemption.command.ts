import { ExemptionRepository } from '../../domain/repositories/exemption.repository';
import { PolicyExemption } from '../../domain/entities/policy-exemption.entity';
import { ExemptionId } from '../../domain/value-objects/exemption-id';
import {
  ExemptionNotFoundError,
  UnauthorizedExemptionApprovalError,
} from '../../domain/errors/policy-controls.errors';
import { CommandResult } from '../../../../apps/api/src/shared/application/command-result';

export interface ApproveExemptionInput {
  exemptionId: string;
  workspaceId: string;
  approvedBy: string;
}

export class ApproveExemptionHandler {
  constructor(private readonly exemptionRepository: ExemptionRepository) {}

  async handle(input: ApproveExemptionInput): Promise<CommandResult<void>> {
    const exemption = await this.exemptionRepository.findById(
      ExemptionId.fromString(input.exemptionId)
    );
    if (
      !exemption ||
      exemption.getWorkspaceId().getValue() !== input.workspaceId
    ) {
      throw new ExemptionNotFoundError(input.exemptionId);
    }

    if (exemption.getRequestedBy() === input.approvedBy) {
      throw new UnauthorizedExemptionApprovalError(input.approvedBy);
    }

    exemption.approve(input.approvedBy);
    await this.exemptionRepository.save(exemption);

    return CommandResult.success();
  }
}
