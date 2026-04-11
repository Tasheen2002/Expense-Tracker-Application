import { ReceiptService } from '../services/receipt.service';
import {
  IQuery,
  IQueryHandler,
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

export class GetReceiptStatsHandler implements IQueryHandler<GetReceiptStatsQuery, ReceiptStats> {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(query: GetReceiptStatsQuery): Promise<ReceiptStats> {
    return this.receiptService.getReceiptStats(query.workspaceId);
  }
}
