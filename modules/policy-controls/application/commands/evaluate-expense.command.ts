import {
  PolicyEvaluationService,
  ExpenseContext,
  PolicyEvaluationResult,
} from "../services/policy-evaluation.service";

export interface EvaluateExpenseInput extends ExpenseContext {}

export class EvaluateExpenseHandler {
  constructor(
    private readonly policyEvaluationService: PolicyEvaluationService,
  ) {}

  async handle(input: EvaluateExpenseInput): Promise<PolicyEvaluationResult> {
    return this.policyEvaluationService.evaluateExpense(input);
  }
}
