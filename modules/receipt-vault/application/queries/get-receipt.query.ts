import { ReceiptService } from '../services/receipt.service';
import { ReceiptDTO } from '../../domain/entities/receipt.entity';
import { ReceiptNotFoundError } from '../../domain/errors/receipt.errors';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';

export interface GetReceiptQuery extends IQuery {
  receiptId: string;
  workspaceId: string;
}

export class GetReceiptHandler implements IQueryHandler<
  GetReceiptQuery,
  QueryResult<ReceiptDTO>
> {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(query: GetReceiptQuery): Promise<QueryResult<ReceiptDTO>> {
    const receiptDTO = await this.receiptService.getReceipt(
      query.receiptId,
      query.workspaceId
    );
    if (!receiptDTO) {
      throw new ReceiptNotFoundError(query.receiptId, query.workspaceId);
    }
    return QueryResult.success(receiptDTO);
  }
}
