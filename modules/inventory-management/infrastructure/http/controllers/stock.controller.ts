import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { AdjustStockHandler } from '../../../application/commands/adjust-stock.command';
import { GetStockHandler } from '../../../application/queries/get-stock.query';
import { ListTransactionsHandler } from '../../../application/queries/list-transactions.query';
import { TransactionType } from '../../../domain/enums/transaction-type';
import { ResponseHelper } from '@shared/response.helper';

export class StockController {
  constructor(
    private readonly adjustStockHandler: AdjustStockHandler,
    private readonly getStockHandler: GetStockHandler,
    private readonly listTransactionsHandler: ListTransactionsHandler
  ) {}

  async adjustStock(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Body: {
        variantId: string;
        locationId: string;
        quantity: number;
        type: string;
        notes?: string;
        referenceId?: string;
        referenceType?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;
      const { workspaceId } = request.params;
      const result = await this.adjustStockHandler.handle({
        workspaceId,
        variantId: request.body.variantId,
        locationId: request.body.locationId,
        quantity: request.body.quantity,
        type: request.body.type as TransactionType,
        notes: request.body.notes,
        referenceId: request.body.referenceId,
        referenceType: request.body.referenceType,
        createdBy: userId,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Stock adjusted successfully',
        result.data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getStock(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: { locationId?: string; limit?: string; offset?: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { locationId, limit, offset } = request.query;
      const result = await this.getStockHandler.handle({
        workspaceId,
        locationId,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      });
      return ResponseHelper.ok(reply, 'Stock retrieved successfully', {
        items: result.items,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.hasMore,
        },
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listTransactions(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: {
        variantId?: string;
        locationId?: string;
        limit?: string;
        offset?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { variantId, locationId, limit, offset } = request.query;
      const result = await this.listTransactionsHandler.handle({
        workspaceId,
        variantId,
        locationId,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      });
      return ResponseHelper.ok(reply, 'Transactions retrieved successfully', {
        items: result.items,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.hasMore,
        },
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
