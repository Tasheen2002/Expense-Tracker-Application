import { IQuery, IQueryHandler } from '@core/application/cqrs';
import { ReceiptService } from '../services/receipt.service';

export interface DownloadReceiptQuery extends IQuery {
  receiptId: string; workspaceId: string; userId: string;
}
export class DownloadReceiptHandler implements IQueryHandler<DownloadReceiptQuery, { bytes: Buffer; mimeType: string; originalName: string }> {
  constructor(private readonly receipts: ReceiptService) {}
  handle(query: DownloadReceiptQuery) {
    return this.receipts.downloadReceipt(query.receiptId, query.workspaceId, query.userId);
  }
}
