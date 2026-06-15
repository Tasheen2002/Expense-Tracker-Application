import {
  PolicyEvaluationService,
  ExpenseContext,
} from '../services/policy-evaluation.service';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';
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
    const result = await this.policyEvaluationService.evaluateExpense(input);

    return CommandResult.success({
      passed: result.passed,
      violationIds: result.violations.map((v) => v.id.getValue()),
      blockedByPolicyId: result.blockedByPolicy?.id.getValue(),
    });
  }
}
