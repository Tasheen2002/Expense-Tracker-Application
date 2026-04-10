import { ViolationService } from '../services/violation.service';
import { PolicyViolationDTO } from '../../domain/entities/policy-violation.entity';
import { ICommand, ICommandHandler } from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface ExemptViolationInput extends ICommand {
  violationId: string;
  workspaceId: string;
  exemptedBy: string;
}

export class ExemptViolationHandler implements ICommandHandler<ExemptViolationInput, CommandResult<PolicyViolationDTO>> {
  constructor(private readonly violationService: ViolationService) {}

  async handle(input: ExemptViolationInput): Promise<CommandResult<PolicyViolationDTO>> {
    const dto = await this.violationService.exemptViolation(
      input.violationId,
      input.workspaceId,
      input.exemptedBy,
    );
    return CommandResult.success(dto);
  }
}
