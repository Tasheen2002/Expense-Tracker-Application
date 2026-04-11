import { ExpenseAllocationService } from '../services/expense-allocation.service';
import { ExpenseAllocationDTO } from '../../domain/entities/expense-allocation.entity';
import { IQuery, IQueryHandler } from '../../../../packages/core/src/application/cqrs';

export interface GetExpenseAllocationsQuery extends IQuery {
  expenseId: string;
  workspaceId: string;
}

export class GetExpenseAllocationsHandler implements IQueryHandler<GetExpenseAllocationsQuery, ExpenseAllocationDTO[]> {
  constructor(
    private readonly expenseAllocationService: ExpenseAllocationService
  ) {}

  async handle(query: GetExpenseAllocationsQuery): Promise<ExpenseAllocationDTO[]> {
    return this.expenseAllocationService.getAllocations(
      query.expenseId,
      query.workspaceId
    );
  }
}
