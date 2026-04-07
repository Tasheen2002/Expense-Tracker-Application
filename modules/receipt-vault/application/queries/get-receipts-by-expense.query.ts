import { ReceiptService } from '../services/receipt.service';
import { ReceiptDTO } from '../../domain/entities/receipt.entity';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export interface GetReceiptsByExpenseQuery extends IQuery {
  expenseId: string;
  workspaceId: string;
}

export class GetReceiptsByExpenseHandler implements IQueryHandler<
  GetReceiptsByExpenseQuery,
  QueryResult<PaginatedResult<ReceiptDTO>>
> {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(
    query: GetReceiptsByExpenseQuery,
  ): Promise<QueryResult<PaginatedResult<ReceiptDTO>>> {
    const result = await this.receiptService.getReceiptsByExpense(
      query.expenseId,
      query.workspaceId,
    );
    return QueryResult.success(result);
  }
}
