import { ReceiptService } from '../services/receipt.service';
import { ReceiptMetadata } from '../../domain/entities/receipt-metadata.entity';
import { ReceiptMetadataNotFoundError } from '../../domain/errors/receipt.errors';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';

export interface GetReceiptMetadataQuery extends IQuery {
  receiptId: string;
  workspaceId: string;
}

export class GetReceiptMetadataHandler implements IQueryHandler<
  GetReceiptMetadataQuery,
  QueryResult<ReceiptMetadata>
> {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(
    query: GetReceiptMetadataQuery
  ): Promise<QueryResult<ReceiptMetadata>> {
    const metadata = await this.receiptService.getMetadata(
      query.receiptId,
      query.workspaceId
    );
    if (!metadata) {
      throw new ReceiptMetadataNotFoundError(query.receiptId);
    }
    return QueryResult.success(metadata);
  }
}
