import { ExemptionRepository } from '../../domain/repositories/exemption.repository';
import { ExemptionStatus } from '../../domain/enums/exemption-status.enum';
import { CommandResult } from '../../../../apps/api/src/shared/application/command-result';

export interface ExpireExemptionsInput {
  workspaceId: string;
}

export class ExpireExemptionsHandler {
  constructor(private readonly exemptionRepository: ExemptionRepository) {}

  async handle(input: ExpireExemptionsInput): Promise<CommandResult<void>> {
    // Get all approved exemptions and check which ones have expired
    const result = await this.exemptionRepository.findByWorkspace(
      input.workspaceId,
      {
        status: ExemptionStatus.APPROVED,
      }
    );

    for (const exemption of result.items) {
      if (exemption.isExpired()) {
        exemption.markExpired();
        await this.exemptionRepository.save(exemption);
      }
    }

    return CommandResult.success();
  }
}
