import { ReceiptService } from '../services/receipt.service';
import { ReceiptMetadataDTO } from '../../domain/entities/receipt-metadata.entity';
import { ReceiptMetadataNotFoundError } from '../../domain/errors/receipt.errors';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';

export interface GetReceiptMetadataQuery extends IQuery {
  receiptId: string;
  workspaceId: string;
}

export class GetReceiptMetadataHandler implements IQueryHandler<GetReceiptMetadataQuery, ReceiptMetadataDTO> {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(query: GetReceiptMetadataQuery): Promise<ReceiptMetadataDTO> {
    const metadataDTO = await this.receiptService.getMetadata(
      query.receiptId,
      query.workspaceId
    );
    if (!metadataDTO) {
      throw new ReceiptMetadataNotFoundError(query.receiptId);
    }
    return metadataDTO;
  }
}
