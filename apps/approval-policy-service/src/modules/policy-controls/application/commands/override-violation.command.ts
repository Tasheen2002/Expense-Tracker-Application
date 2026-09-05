import { ViolationService } from '../services/violation.service';
import { PolicyViolationDTO } from '../../domain/entities/policy-violation.entity';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface OverrideViolationInput extends ICommand {
  readonly violationId: string;
  readonly workspaceId: string;
  readonly overriddenBy: string;
  readonly overrideReason: string;
}

export class OverrideViolationHandler implements ICommandHandler<OverrideViolationInput, CommandResult<PolicyViolationDTO>> {
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
