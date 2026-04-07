import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { CreateSupplierHandler } from '../../../application/commands/create-supplier.command';
import { UpdateSupplierHandler } from '../../../application/commands/update-supplier.command';
import { DeleteSupplierHandler } from '../../../application/commands/delete-supplier.command';
import { GetSupplierHandler } from '../../../application/queries/get-supplier.query';
import { ListSuppliersHandler } from '../../../application/queries/list-suppliers.query';
import { ResponseHelper } from '@shared/response.helper';

export class SupplierController {
  constructor(
    private readonly createSupplierHandler: CreateSupplierHandler,
    private readonly updateSupplierHandler: UpdateSupplierHandler,
    private readonly deleteSupplierHandler: DeleteSupplierHandler,
    private readonly getSupplierHandler: GetSupplierHandler,
    private readonly listSuppliersHandler: ListSuppliersHandler
  ) {}

  async createSupplier(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Body: {
        name: string;
        contactEmail?: string;
        contactPhone?: string;
        address?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const result = await this.createSupplierHandler.handle({
        workspaceId,
        ...request.body,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Supplier created successfully',
        result.data,
        201
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updateSupplier(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; supplierId: string };
      Body: {
        name?: string;
        contactEmail?: string | null;
        contactPhone?: string | null;
        address?: string | null;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, supplierId } = request.params;
      const result = await this.updateSupplierHandler.handle({
        supplierId,
        workspaceId,
        ...request.body,
      });
      return ResponseHelper.fromCommand(reply, result, 'Supplier updated successfully');
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteSupplier(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; supplierId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, supplierId } = request.params;
      const result = await this.deleteSupplierHandler.handle({
        supplierId,
        workspaceId,
      });
      if (!result.success) {
        return ResponseHelper.fromCommand(reply, result, 'Supplier deletion failed');
      }
      return reply.status(204).send();
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getSupplier(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; supplierId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, supplierId } = request.params;
      const result = await this.getSupplierHandler.handle({
        supplierId,
        workspaceId,
      });
      return ResponseHelper.fromQuery(reply, result, 'Supplier retrieved successfully');
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listSuppliers(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: { limit?: string; offset?: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { limit, offset } = request.query;
      const result = await this.listSuppliersHandler.handle({
        workspaceId,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      });
      return ResponseHelper.fromQuery(reply, result, 'Suppliers retrieved successfully');
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
