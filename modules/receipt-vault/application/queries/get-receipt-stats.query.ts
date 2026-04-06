import { ReceiptService } from '../services/receipt.service';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';

export interface ReceiptStats {
  total: number;
  pending: number;
  processing: number;
  processed: number;
  failed: number;
  verified: number;
}

export interface GetReceiptStatsQuery extends IQuery {
  workspaceId: string;
}

export class GetReceiptStatsHandler implements IQueryHandler<
  GetReceiptStatsQuery,
  QueryResult<ReceiptStats>
> {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(
    query: GetReceiptStatsQuery
  ): Promise<QueryResult<ReceiptStats>> {
    try {
      const stats = await this.receiptService.getReceiptStats(
        query.workspaceId
      );
      return QueryResult.success(stats);
    } catch (error: unknown) {
      return QueryResult.fromError(error);
    }
  }
}
