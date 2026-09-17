import { ReceiptService } from '../services/receipt.service';
import { ReceiptDTO } from '../../domain/entities/receipt.entity';
import { ReceiptNotFoundError } from '../../domain/errors/receipt.errors';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface GetReceiptQuery extends IQuery {
  readonly receiptId: string;
  readonly workspaceId: string;
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
