import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@expense-tracker/middleware';
import { ResponseHelper } from '@shared/response.helper';
import { ConnectBankHandler } from '../../../application/commands/connect-bank.command';
import { DisconnectBankHandler } from '../../../application/commands/disconnect-bank.command';
import { UpdateConnectionTokenHandler } from '../../../application/commands/update-connection-token.command';
import { DeleteConnectionHandler } from '../../../application/commands/delete-connection.command';
import { GetBankConnectionsHandler } from '../../../application/queries/get-bank-connections.query';
import { GetBankConnectionHandler } from '../../../application/queries/get-bank-connection.query';
import {
  ConnectBankBody,
  ConnectionParams,
  PaginationQuery,
  UpdateConnectionTokenBody,
  WorkspaceParams,
} from '../validation/bank-sync.schema';

export class BankConnectionController {
  constructor(
    private readonly connectBankHandler: ConnectBankHandler,
    private readonly disconnectBankHandler: DisconnectBankHandler,
    private readonly updateConnectionTokenHandler: UpdateConnectionTokenHandler,
    private readonly deleteConnectionHandler: DeleteConnectionHandler,
    private readonly getBankConnectionsHandler: GetBankConnectionsHandler,
    private readonly getBankConnectionHandler: GetBankConnectionHandler
  ) {}

  async getConnections(
    request: AuthenticatedRequest<{
      Params: WorkspaceParams;
      Querystring: PaginationQuery;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { limit, offset } = request.query;

      const result = await this.getBankConnectionsHandler.handle({
        workspaceId,
        limit: limit ?? 50,
        offset: offset ?? 0,
      });

      return ResponseHelper.ok(reply, 'Bank connections retrieved successfully', {
        connections: result.items,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.hasMore,
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getConnection(
    request: AuthenticatedRequest<{
      Params: ConnectionParams;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, connectionId } = request.params;

      const connection = await this.getBankConnectionHandler.handle({
        workspaceId,
        connectionId,
      });

      return ResponseHelper.ok(reply, 'Bank connection retrieved successfully', connection);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async connectBank(
    request: AuthenticatedRequest<{
      Params: WorkspaceParams;
      Body: ConnectBankBody;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { userId } = request.user;
      const body = request.body;

      const result = await this.connectBankHandler.handle({
        workspaceId,
        userId,
        institutionId: body.institutionId,
        institutionName: body.institutionName,
        accountId: body.accountId,
        accountName: body.accountName,
        accountType: body.accountType,
        currency: body.currency,
        accessToken: body.accessToken,
        accountMask: body.accountMask,
        tokenExpiresAt: body.tokenExpiresAt,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Bank connection created successfully',
        result.data ?? undefined,
        201
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updateConnectionToken(
    request: AuthenticatedRequest<{
      Params: ConnectionParams;
      Body: UpdateConnectionTokenBody;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, connectionId } = request.params;
      const body = request.body;

      const result = await this.updateConnectionTokenHandler.handle({
        workspaceId,
        connectionId,
        accessToken: body.accessToken,
        tokenExpiresAt: body.tokenExpiresAt,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Connection token updated successfully',
        undefined
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async disconnectBank(
    request: AuthenticatedRequest<{
      Params: ConnectionParams;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, connectionId } = request.params;

      const result = await this.disconnectBankHandler.handle({
        workspaceId,
        connectionId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Bank connection disconnected successfully',
        undefined,
        204
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteConnection(
    request: AuthenticatedRequest<{
      Params: ConnectionParams;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, connectionId } = request.params;

      const result = await this.deleteConnectionHandler.handle({
        workspaceId,
        connectionId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Bank connection deleted successfully',
        undefined,
        204
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
