import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@expense-tracker/middleware';
import { AdjustStockHandler } from '../../../application/commands/adjust-stock.command';
import { UpdateStockSettingsHandler } from '../../../application/commands/update-stock-settings.command';
import { GetStockHandler } from '../../../application/queries/get-stock.query';
import { ListTransactionsHandler } from '../../../application/queries/list-transactions.query';
import { ResponseHelper } from '@shared/response.helper';
import {
  AdjustStockInput,
  UpdateStockSettingsInput,
  ListStockQuery,
  ListTransactionsQuery,
} from '../validation/inventory.schema';

export class StockController {
  constructor(
    private readonly adjustStockHandler: AdjustStockHandler,
    private readonly updateStockSettingsHandler: UpdateStockSettingsHandler,
    private readonly getStockHandler: GetStockHandler,
    private readonly listTransactionsHandler: ListTransactionsHandler
  ) {}

  async adjustStock(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Body: AdjustStockInput;
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
        type: request.body.type,
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

  async updateStockSettings(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; stockId: string };
      Body: UpdateStockSettingsInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const result = await this.updateStockSettingsHandler.handle({
        workspaceId: request.params.workspaceId,
        stockId: request.params.stockId,
        reorderLevel: request.body.reorderLevel,
        reorderQuantity: request.body.reorderQuantity,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Stock settings updated successfully',
        result.data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getStock(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: ListStockQuery;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { locationId, limit, offset } = request.query;
      const result = await this.getStockHandler.handle({
        workspaceId,
        locationId,
        limit,
        offset,
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
      Querystring: ListTransactionsQuery;
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
        limit,
        offset,
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
