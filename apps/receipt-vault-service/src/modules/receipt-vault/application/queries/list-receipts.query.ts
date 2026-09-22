import { ReceiptService } from '../services/receipt.service';
import { ReceiptDTO } from '../../domain/entities/receipt.entity';
import { ReceiptStatus } from '../../domain/enums/receipt-status';
import { ReceiptType } from '../../domain/enums/receipt-type';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';

export interface ListReceiptsQuery extends IQuery {
  readonly workspaceId: string;
  readonly userId?: string;
  readonly expenseId?: string;
  readonly status?: ReceiptStatus;
  readonly receiptType?: ReceiptType;
  readonly isLinked?: boolean;
  readonly isDeleted?: boolean;
  readonly fromDate?: Date;
  readonly toDate?: Date;
  readonly limit?: number;
  readonly offset?: number;
}

export class ListReceiptsHandler implements IQueryHandler<ListReceiptsQuery, PaginatedResult<ReceiptDTO>> {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(query: ListReceiptsQuery): Promise<PaginatedResult<ReceiptDTO>> {
    return this.receiptService.filterReceipts(
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
  }
}
