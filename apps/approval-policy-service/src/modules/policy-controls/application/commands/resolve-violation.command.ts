import { ViolationService } from '../services/violation.service';
import { PolicyViolationDTO } from '../../domain/entities/policy-violation.entity';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface ResolveViolationInput extends ICommand {
  readonly violationId: string;
  readonly workspaceId: string;
  readonly resolvedBy: string;
  readonly resolutionNote?: string;
}

export class ResolveViolationHandler implements ICommandHandler<ResolveViolationInput, CommandResult<PolicyViolationDTO>> {
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
