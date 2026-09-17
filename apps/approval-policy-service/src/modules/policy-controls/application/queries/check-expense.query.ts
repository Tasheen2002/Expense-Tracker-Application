import { IQuery, IQueryHandler } from '@core/application/cqrs';
import {
  PolicyEvaluationService,
  CheckExpenseResult,
  ExpenseContext,
} from '../services/policy-evaluation.service';
import { OperationService } from '../../../../shared/services/operation.service';
import { UnauthorizedWorkspaceAccessError } from '../../../../shared/errors/workspace-authorization.error';

export interface CheckExpenseInput extends IQuery {
  readonly actorId: string;
  readonly workspaceId: string;
  readonly amount: number;
  readonly currency: string;
  readonly categoryId?: string;
  readonly merchant?: string;
  readonly description?: string;
  readonly hasReceipt?: boolean;
  readonly expenseDate?: Date;
  readonly timezone?: string;
  readonly authToken?: string;
}

export class CheckExpenseHandler implements IQueryHandler<CheckExpenseInput, CheckExpenseResult> {
  constructor(
    private readonly policyEvaluationService: PolicyEvaluationService,
    private readonly operations: OperationService
  ) {}

  async handle(input: CheckExpenseInput): Promise<CheckExpenseResult> {
    if (!input.actorId) {
      throw new UnauthorizedWorkspaceAccessError('Actor ID is required for policy check');
    }

    const membership = await this.operations.authorize({
      actorId: input.actorId,
      workspaceId: input.workspaceId,
      authToken: input.authToken,
    });

    const context: ExpenseContext = {
      expenseId: '00000000-0000-4000-8000-000000000000',
      workspaceId: input.workspaceId,
      userId: input.actorId,
      amount: input.amount,
      currency: input.currency,
      categoryId: input.categoryId,
      merchant: input.merchant,
      description: input.description,
      hasReceipt: Boolean(input.hasReceipt),
      expenseDate: input.expenseDate ?? new Date(),
      userRole: membership.role,
      timezone: input.timezone,
    };

    return this.policyEvaluationService.checkExpense(context);
  }
}
