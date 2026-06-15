import { ViolationService } from '../services/violation.service';
import { PolicyViolationDTO } from '../../domain/entities/policy-violation.entity';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface AcknowledgeViolationInput extends ICommand {
  readonly violationId: string;
  readonly workspaceId: string;
  readonly acknowledgedBy: string;
}

export class AcknowledgeViolationHandler implements ICommandHandler<AcknowledgeViolationInput, CommandResult<PolicyViolationDTO>> {
  constructor(private readonly violationService: ViolationService) {}

  async handle(input: AcknowledgeViolationInput): Promise<CommandResult<PolicyViolationDTO>> {
    const dto = await this.violationService.acknowledgeViolation(
      input.violationId,
      input.workspaceId,
      input.acknowledgedBy,
    );
    return CommandResult.success(dto);
  }
}
