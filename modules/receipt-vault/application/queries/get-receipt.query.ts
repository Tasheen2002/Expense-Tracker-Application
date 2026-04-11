import { ReceiptService } from '../services/receipt.service';
import { ReceiptDTO } from '../../domain/entities/receipt.entity';
import { ReceiptNotFoundError } from '../../domain/errors/receipt.errors';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';

export interface GetReceiptQuery extends IQuery {
  receiptId: string;
  workspaceId: string;
}

export class GetReceiptHandler implements IQueryHandler<GetReceiptQuery, ReceiptDTO> {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(query: GetReceiptQuery): Promise<ReceiptDTO> {
    const receiptDTO = await this.receiptService.getReceipt(
      query.receiptId,
      query.workspaceId
    );
    if (!receiptDTO) {
      throw new ReceiptNotFoundError(query.receiptId, query.workspaceId);
    }
    return receiptDTO;
  }
}
