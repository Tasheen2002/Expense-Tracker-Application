import { ReceiptService } from '../services/receipt.service';
import { Receipt } from '../../domain/entities/receipt.entity';
import { ReceiptNotFoundError } from '../../domain/errors/receipt.errors';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../apps/api/src/shared/application';

export interface GetReceiptQuery extends IQuery {
  receiptId: string;
  workspaceId: string;
}

export class GetReceiptHandler implements IQueryHandler<
  GetReceiptQuery,
  QueryResult<Receipt>
> {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(query: GetReceiptQuery): Promise<QueryResult<Receipt>> {
    const receipt = await this.receiptService.getReceipt(
      query.receiptId,
      query.workspaceId
    );
    if (!receipt) {
      throw new ReceiptNotFoundError(query.receiptId, query.workspaceId);
    }
    return QueryResult.success(receipt);
  }
}
