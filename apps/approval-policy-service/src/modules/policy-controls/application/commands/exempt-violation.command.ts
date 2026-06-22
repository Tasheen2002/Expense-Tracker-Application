import { ViolationService } from '../services/violation.service';
import { PolicyViolationDTO } from '../../domain/entities/policy-violation.entity';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface ExemptViolationInput extends ICommand {
  readonly violationId: string;
  readonly workspaceId: string;
  readonly exemptedBy: string;
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
