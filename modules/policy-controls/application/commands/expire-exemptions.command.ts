import { IExemptionRepository } from '../../domain/repositories/exemption.repository';
import { ExemptionStatus } from '../../domain/enums/exemption-status.enum';
import { ICommand, ICommandHandler } from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface ExpireExemptionsInput extends ICommand {
  workspaceId: string;
}

export class ExpireExemptionsHandler implements ICommandHandler<ExpireExemptionsInput, CommandResult<void>> {
  constructor(private readonly exemptionRepository: IExemptionRepository) {}

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
