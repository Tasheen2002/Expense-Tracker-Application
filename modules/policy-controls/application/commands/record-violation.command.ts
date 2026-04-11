import { ViolationService } from '../services/violation.service';
import { PolicyViolationDTO } from '../../domain/entities/policy-violation.entity';
import { ViolationSeverity } from '../../domain/enums/violation-severity.enum';
import { ICommand, ICommandHandler } from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface RecordViolationInput extends ICommand {
  workspaceId: string;
  policyId: string;
  expenseId: string;
  userId: string;
  severity: ViolationSeverity;
  violationDetails: string;
  expenseAmount: number;
  currency: string;
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
