import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { CreatePurchaseOrderHandler } from '../../../application/commands/create-purchase-order.command';
import { UpdatePurchaseOrderHandler } from '../../../application/commands/update-purchase-order.command';
import { DeletePurchaseOrderHandler } from '../../../application/commands/delete-purchase-order.command';
import { SubmitPurchaseOrderHandler } from '../../../application/commands/submit-purchase-order.command';
import { ApprovePurchaseOrderHandler } from '../../../application/commands/approve-purchase-order.command';
import { ReceivePurchaseOrderHandler } from '../../../application/commands/receive-purchase-order.command';
import { CancelPurchaseOrderHandler } from '../../../application/commands/cancel-purchase-order.command';
import { AddPurchaseOrderItemHandler } from '../../../application/commands/add-purchase-order-item.command';
import { RemovePurchaseOrderItemHandler } from '../../../application/commands/remove-purchase-order-item.command';
import { GetPurchaseOrderHandler } from '../../../application/queries/get-purchase-order.query';
import { ListPurchaseOrdersHandler } from '../../../application/queries/list-purchase-orders.query';
import { PurchaseOrderStatus } from '../../../domain/enums/purchase-order-status';
import { ResponseHelper } from '@shared/response.helper';

export class PurchaseOrderController {
  constructor(
    private readonly createPOHandler: CreatePurchaseOrderHandler,
    private readonly updatePOHandler: UpdatePurchaseOrderHandler,
    private readonly deletePOHandler: DeletePurchaseOrderHandler,
    private readonly submitPOHandler: SubmitPurchaseOrderHandler,
    private readonly approvePOHandler: ApprovePurchaseOrderHandler,
    private readonly receivePOHandler: ReceivePurchaseOrderHandler,
    private readonly cancelPOHandler: CancelPurchaseOrderHandler,
    private readonly addItemHandler: AddPurchaseOrderItemHandler,
    private readonly removeItemHandler: RemovePurchaseOrderItemHandler,
    private readonly getPOHandler: GetPurchaseOrderHandler,
    private readonly listPOsHandler: ListPurchaseOrdersHandler
  ) {}

  async createPurchaseOrder(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Body: {
        supplierId: string;
        orderDate: string;
        expectedDate?: string;
        notes?: string;
        currency?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;
      const { workspaceId } = request.params;
      const result = await this.createPOHandler.handle({
        workspaceId,
        supplierId: request.body.supplierId,
        orderDate: new Date(request.body.orderDate),
        expectedDate: request.body.expectedDate
          ? new Date(request.body.expectedDate)
          : undefined,
        notes: request.body.notes,
        currency: request.body.currency,
        createdBy: userId,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Purchase order created successfully',
        result.data,
        201
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updatePurchaseOrder(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; purchaseOrderId: string };
      Body: { notes?: string | null; expectedDate?: string | null };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, purchaseOrderId } = request.params;
      const result = await this.updatePOHandler.handle({
        purchaseOrderId,
        workspaceId,
        notes: request.body.notes,
        expectedDate: request.body.expectedDate
          ? new Date(request.body.expectedDate)
          : request.body.expectedDate === null
            ? null
            : undefined,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Purchase order updated successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deletePurchaseOrder(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; purchaseOrderId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, purchaseOrderId } = request.params;
      const result = await this.deletePOHandler.handle({
        purchaseOrderId,
        workspaceId,
      });
      if (!result.success) {
        return ResponseHelper.fromCommand(
          reply,
          result,
          'Purchase order deletion failed'
        );
      }
      return reply.status(204).send();
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async submitPurchaseOrder(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; purchaseOrderId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, purchaseOrderId } = request.params;
      const result = await this.submitPOHandler.handle({
        purchaseOrderId,
        workspaceId,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Purchase order submitted successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async approvePurchaseOrder(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; purchaseOrderId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, purchaseOrderId } = request.params;
      const result = await this.approvePOHandler.handle({
        purchaseOrderId,
        workspaceId,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Purchase order approved successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async receivePurchaseOrder(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; purchaseOrderId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, purchaseOrderId } = request.params;
      const result = await this.receivePOHandler.handle({
        purchaseOrderId,
        workspaceId,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Purchase order received successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async cancelPurchaseOrder(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; purchaseOrderId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, purchaseOrderId } = request.params;
      const result = await this.cancelPOHandler.handle({
        purchaseOrderId,
        workspaceId,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Purchase order cancelled successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async addItem(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; purchaseOrderId: string };
      Body: {
        variantId: string;
        variantName: string;
        quantity: number;
        unitPrice: number;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, purchaseOrderId } = request.params;
      const result = await this.addItemHandler.handle({
        purchaseOrderId,
        workspaceId,
        ...request.body,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Item added successfully',
        result.data,
        201
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async removeItem(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; purchaseOrderId: string; itemId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, itemId } = request.params;
      const result = await this.removeItemHandler.handle({
        itemId,
        workspaceId,
      });
      if (!result.success) {
        return ResponseHelper.fromCommand(reply, result, 'Item removal failed');
      }
      return reply.status(204).send();
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getPurchaseOrder(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; purchaseOrderId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, purchaseOrderId } = request.params;
      const result = await this.getPOHandler.handle({
        purchaseOrderId,
        workspaceId,
      });
      return ResponseHelper.fromQuery(
        reply,
        result,
        'Purchase order retrieved successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listPurchaseOrders(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: {
        status?: string;
        supplierId?: string;
        limit?: string;
        offset?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { status, supplierId, limit, offset } = request.query;
      const result = await this.listPOsHandler.handle({
        workspaceId,
        status: status as PurchaseOrderStatus | undefined,
        supplierId,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      });
      return ResponseHelper.fromQuery(
        reply,
        result,
        'Purchase orders retrieved successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
