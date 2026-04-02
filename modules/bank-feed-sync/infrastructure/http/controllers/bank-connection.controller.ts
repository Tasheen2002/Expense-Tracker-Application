import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import { ResponseHelper } from '../../../../../apps/api/src/shared/response.helper';
import { ConnectBankHandler } from '../../../application/commands/connect-bank.command';
import { DisconnectBankHandler } from '../../../application/commands/disconnect-bank.command';
import { UpdateConnectionTokenHandler } from '../../../application/commands/update-connection-token.command';
import { DeleteConnectionHandler } from '../../../application/commands/delete-connection.command';
import { GetBankConnectionsHandler } from '../../../application/queries/get-bank-connections.query';
import { GetBankConnectionHandler } from '../../../application/queries/get-bank-connection.query';

export class BankConnectionController {
  constructor(
    private readonly connectBankHandler: ConnectBankHandler,
    private readonly disconnectBankHandler: DisconnectBankHandler,
    private readonly updateConnectionTokenHandler: UpdateConnectionTokenHandler,
    private readonly deleteConnectionHandler: DeleteConnectionHandler,
    private readonly getBankConnectionsHandler: GetBankConnectionsHandler,
    private readonly getBankConnectionHandler: GetBankConnectionHandler
  ) {}

  async connectBank(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const { workspaceId } = request.params as { workspaceId: string };
      const { userId } = request.user;
      const body = request.body as {
        institutionId: string;
        institutionName: string;
        accountId: string;
        accountName: string;
        accountType: string;
        currency: string;
        accessToken: string;
        accountMask?: string;
        tokenExpiresAt?: string;
      };

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
        tokenExpiresAt: body.tokenExpiresAt
          ? new Date(body.tokenExpiresAt)
          : undefined,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Bank connection created successfully',
        result.data,
        201
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getConnections(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const { workspaceId } = request.params as { workspaceId: string };
      const { limit, offset } = request.query as {
        limit?: string;
        offset?: string;
      };

      const parsedLimit = limit ? parseInt(limit, 10) : 50;
      const parsedOffset = offset ? parseInt(offset, 10) : 0;

      const result = await this.getBankConnectionsHandler.handle({
        workspaceId,
        limit: Math.min(
          Math.max(1, isNaN(parsedLimit) ? 50 : parsedLimit),
          100
        ),
        offset: Math.max(0, isNaN(parsedOffset) ? 0 : parsedOffset),
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Bank connections retrieved successfully',
        result.data
          ? {
              connections: result.data.items,
              total: result.data.total,
              limit: result.data.limit,
              offset: result.data.offset,
              hasMore: result.data.hasMore,
            }
          : undefined
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getConnection(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const { workspaceId, connectionId } = request.params as {
        workspaceId: string;
        connectionId: string;
      };

      const result = await this.getBankConnectionHandler.handle({
        workspaceId,
        connectionId,
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Bank connection retrieved successfully',
        result.data
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updateConnectionToken(
    request: AuthenticatedRequest,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, connectionId } = request.params as {
        workspaceId: string;
        connectionId: string;
      };
      const body = request.body as {
        accessToken: string;
        tokenExpiresAt?: string;
      };

      const result = await this.updateConnectionTokenHandler.handle({
        workspaceId,
        connectionId,
        accessToken: body.accessToken,
        tokenExpiresAt: body.tokenExpiresAt
          ? new Date(body.tokenExpiresAt)
          : undefined,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Connection token updated successfully',
        undefined
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async disconnectBank(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const { workspaceId, connectionId } = request.params as {
        workspaceId: string;
        connectionId: string;
      };

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
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteConnection(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const { workspaceId, connectionId } = request.params as {
        workspaceId: string;
        connectionId: string;
      };

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
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }
}

