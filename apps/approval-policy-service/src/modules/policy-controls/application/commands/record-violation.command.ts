import { ViolationService } from '../services/violation.service';
import { PolicyViolationDTO } from '../../domain/entities/policy-violation.entity';
import { ViolationSeverity } from '../../domain/enums/violation-severity.enum';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface RecordViolationInput extends ICommand {
  readonly workspaceId: string;
  readonly policyId: string;
  readonly expenseId: string;
  readonly userId: string;
  readonly severity: ViolationSeverity;
  readonly violationDetails: string;
  readonly expenseAmount: number;
  readonly currency: string;
}

export class RecordViolationHandler implements ICommandHandler<RecordViolationInput, CommandResult<PolicyViolationDTO>> {
  constructor(private readonly violationService: ViolationService) {}

  async handle(
    input: RecordViolationInput
  ): Promise<CommandResult<PolicyViolationDTO>> {
    const dto = await this.violationService.createViolation(input);
    return CommandResult.success(dto);
  }
}
