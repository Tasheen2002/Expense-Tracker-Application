import {
  PolicyEvaluationService,
  ExpenseContext,
} from '../services/policy-evaluation.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';
export interface EvaluateExpenseInput extends ICommand, ExpenseContext {}

export interface EvaluateExpenseResult {
  passed: boolean;
  violationIds: string[];
  blockedByPolicyId?: string;
}

export class EvaluateExpenseHandler implements ICommandHandler<
  EvaluateExpenseInput,
  CommandResult<EvaluateExpenseResult>
> {
  constructor(
    private readonly policyEvaluationService: PolicyEvaluationService
  ) {}

  async handle(
    input: EvaluateExpenseInput
  ): Promise<CommandResult<EvaluateExpenseResult>> {
    try {
      const result = await this.policyEvaluationService.evaluateExpense(input);

      return CommandResult.success({
        passed: result.passed,
        violationIds: result.violations.map((v) => v.getId().getValue()),
        blockedByPolicyId: result.blockedByPolicy?.getId().getValue(),
      });
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
