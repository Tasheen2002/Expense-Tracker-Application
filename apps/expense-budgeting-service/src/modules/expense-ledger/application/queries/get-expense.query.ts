import { IQuery, IQueryHandler } from '@core/application/cqrs';
import { ExpenseService } from '../services/expense.service';
import { ExpenseDTO } from '../../domain/entities/expense.entity';
import { ExpenseNotFoundError, UnauthorizedExpenseAccessError } from '../../domain/errors/expense.errors';
import { OperationService } from '../services/operation.service';

import { WorkspaceMembershipContext } from '../ports/workspace-authorization.port';

export interface GetExpenseQuery extends IQuery {
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly role?: string;
  readonly authToken?: string;
  readonly verifiedMembership?: WorkspaceMembershipContext;
}

export class GetExpenseHandler implements IQueryHandler<GetExpenseQuery, ExpenseDTO> {
  constructor(
    private readonly expenseService: ExpenseService,
    private readonly operationService: OperationService
  ) {
    if (!expenseService) {
      throw new Error('ExpenseService is required for GetExpenseHandler');
    }
    if (!operationService) {
      throw new Error('OperationService is required for GetExpenseHandler');
    }
  }

  async handle(query: GetExpenseQuery): Promise<ExpenseDTO> {
    if (!query.userId) {
      throw new UnauthorizedExpenseAccessError(query.expenseId, 'anonymous', 'view');
    }

    // Verify workspace membership at the application boundary
    const membership = await this.operationService.authorize({
      actorId: query.userId,
      workspaceId: query.workspaceId,
      role: query.role,
      authToken: query.authToken,
      verifiedMembership: query.verifiedMembership,
    });

    const expense = await this.expenseService.getExpenseById(
      query.expenseId,
      query.workspaceId
    );

    if (!expense) {
      throw new ExpenseNotFoundError(query.expenseId, query.workspaceId);
    }

    // Application-boundary authorization: enforce expense visibility
    const effectiveRole = query.verifiedMembership?.role || membership.role || query.role;
    this.operationService.authorizeExpenseVisibility(query.userId, expense, effectiveRole);

    return expense;
  }
}
