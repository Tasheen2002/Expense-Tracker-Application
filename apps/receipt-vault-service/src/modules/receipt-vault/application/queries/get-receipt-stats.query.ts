import { ReceiptService } from '../services/receipt.service';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface ReceiptStats {
  readonly total: number;
  readonly pending: number;
  readonly processing: number;
  readonly processed: number;
  readonly failed: number;
  readonly verified: number;
}

export interface GetReceiptStatsQuery extends IQuery {
  readonly workspaceId: string;
}

export class GetReceiptStatsHandler implements IQueryHandler<GetReceiptStatsQuery, ReceiptStats> {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(query: GetReceiptStatsQuery): Promise<ReceiptStats> {
    return this.receiptService.getReceiptStats(query.workspaceId);
  }
}
