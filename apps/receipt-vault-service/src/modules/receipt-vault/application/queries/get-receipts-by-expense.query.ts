import { ReceiptService } from '../services/receipt.service';
import { ReceiptDTO } from '../../domain/entities/receipt.entity';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';

export interface GetReceiptsByExpenseQuery extends IQuery {
  readonly expenseId: string;
  readonly workspaceId: string;
}

export class GetReceiptsByExpenseHandler implements IQueryHandler<GetReceiptsByExpenseQuery, PaginatedResult<ReceiptDTO>> {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(query: GetReceiptsByExpenseQuery): Promise<PaginatedResult<ReceiptDTO>> {
    return this.receiptService.getReceiptsByExpense(
      query.expenseId,
      query.workspaceId,
    );
  }
}
