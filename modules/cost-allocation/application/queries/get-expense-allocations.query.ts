import { ExpenseAllocationService } from '../services/expense-allocation.service';
import { ExpenseAllocation } from '../../domain/entities/expense-allocation.entity';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';

export interface GetExpenseAllocationsQuery extends IQuery {
  expenseId: string;
  workspaceId: string;
}

export class GetExpenseAllocationsHandler implements IQueryHandler<
  GetExpenseAllocationsQuery,
  QueryResult<ExpenseAllocation[]>
> {
  constructor(
    private readonly expenseAllocationService: ExpenseAllocationService
  ) {}

  async handle(
    query: GetExpenseAllocationsQuery
  ): Promise<QueryResult<ExpenseAllocation[]>> {
    const allocations = await this.expenseAllocationService.getAllocations(
      query.expenseId,
      query.workspaceId
    );
    return QueryResult.success(allocations);
  }
}
