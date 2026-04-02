import { ViolationRepository } from '../../domain/repositories/violation.repository';
import { PolicyViolation } from '../../domain/entities/policy-violation.entity';
import { ViolationSeverity } from '../../domain/enums/violation-severity.enum';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface RecordViolationInput {
  workspaceId: string;
  policyId: string;
  expenseId: string;
  userId: string;
  severity: ViolationSeverity;
  violationDetails: string;
  expenseAmount: number;
  currency: string;
}

export class RecordViolationHandler {
  constructor(private readonly violationRepository: ViolationRepository) {}

  async handle(
    input: RecordViolationInput
  ): Promise<CommandResult<{ violationId: string }>> {
    const violation = PolicyViolation.create({
      workspaceId: input.workspaceId,
      policyId: input.policyId,
      expenseId: input.expenseId,
      userId: input.userId,
      severity: input.severity,
      violationDetails: input.violationDetails,
      expenseAmount: input.expenseAmount,
      currency: input.currency,
    });

    await this.violationRepository.save(violation);

    return CommandResult.success({ violationId: violation.getId().getValue() });
  }
}
