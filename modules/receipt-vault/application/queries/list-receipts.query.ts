import { ReceiptService } from '../services/receipt.service';
import { ReceiptDTO } from '../../domain/entities/receipt.entity';
import { ReceiptStatus } from '../../domain/enums/receipt-status';
import { ReceiptType } from '../../domain/enums/receipt-type';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export interface ListReceiptsQuery extends IQuery {
  workspaceId: string;
  userId?: string;
  expenseId?: string;
  status?: ReceiptStatus;
  receiptType?: ReceiptType;
  isLinked?: boolean;
  isDeleted?: boolean;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

export class ListReceiptsHandler implements IQueryHandler<
  ListReceiptsQuery,
  QueryResult<PaginatedResult<ReceiptDTO>>
> {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(query: ListReceiptsQuery): Promise<QueryResult<PaginatedResult<ReceiptDTO>>> {
    const result = await this.receiptService.filterReceipts(
      {
        workspaceId: query.workspaceId,
        userId: query.userId,
        expenseId: query.expenseId,
        status: query.status,
        receiptType: query.receiptType,
        isLinked: query.isLinked,
        isDeleted: query.isDeleted,
        fromDate: query.fromDate,
        toDate: query.toDate,
      },
      {
        limit: query.limit,
        offset: query.offset,
      },
    );
    return QueryResult.success(result);
  }
}
