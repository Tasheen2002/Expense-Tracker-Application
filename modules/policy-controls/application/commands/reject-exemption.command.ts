import { ExemptionRepository } from '../../domain/repositories/exemption.repository';
import { PolicyExemption } from '../../domain/entities/policy-exemption.entity';
import { ExemptionId } from '../../domain/value-objects/exemption-id';
import { ExemptionNotFoundError } from '../../domain/errors/policy-controls.errors';
import { CommandResult } from '../../../../apps/api/src/shared/application/command-result';

export interface RejectExemptionInput {
  exemptionId: string;
  workspaceId: string;
  rejectedBy: string;
  rejectionReason?: string;
}

export class RejectExemptionHandler {
  constructor(private readonly exemptionRepository: ExemptionRepository) {}

  async handle(input: RejectExemptionInput): Promise<CommandResult<void>> {
    const exemption = await this.exemptionRepository.findById(
      ExemptionId.fromString(input.exemptionId)
    );
    if (
      !exemption ||
      exemption.getWorkspaceId().getValue() !== input.workspaceId
    ) {
      throw new ExemptionNotFoundError(input.exemptionId);
    }

    exemption.reject(input.rejectedBy, input.rejectionReason);
    await this.exemptionRepository.save(exemption);

    return CommandResult.success();
  }
}
