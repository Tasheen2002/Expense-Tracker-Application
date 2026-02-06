import { FastifyReply } from "fastify";
import { AuthenticatedRequest } from "../../../../../apps/api/src/shared/interfaces/authenticated-request.interface";
import { ConnectBankHandler } from "../../../application/commands/connect-bank.command";
import { DisconnectBankHandler } from "../../../application/commands/disconnect-bank.command";
import { UpdateConnectionTokenHandler } from "../../../application/commands/update-connection-token.command";
import { GetBankConnectionsHandler } from "../../../application/queries/get-bank-connections.query";
import { BankConnectionService } from "../../../application/services/bank-connection.service";
import {
  createBankConnectionSchema,
  updateConnectionTokenSchema,
} from "../validation/bank-connection.schema";

export class BankConnectionController {
  constructor(
    private readonly connectBankHandler: ConnectBankHandler,
    private readonly disconnectBankHandler: DisconnectBankHandler,
    private readonly updateConnectionTokenHandler: UpdateConnectionTokenHandler,
    private readonly getBankConnectionsHandler: GetBankConnectionsHandler,
    private readonly bankConnectionService: BankConnectionService,
  ) {}

  async connectBank(request: AuthenticatedRequest, reply: FastifyReply) {
    const { workspaceId } = request.params as { workspaceId: string };
    const { userId } = request.user;

    const bodyResult = createBankConnectionSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: "Invalid request body",
        details: bodyResult.error.errors,
      });
    }

    const body = bodyResult.data;

    const connection = await this.connectBankHandler.handle({
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

    return reply.status(201).send({
      id: connection.getId().getValue(),
      workspaceId: connection.getWorkspaceId().getValue(),
      userId: connection.getUserId().getValue(),
      institutionId: connection.institutionId,
      institutionName: connection.institutionName,
      accountId: connection.accountId,
      accountName: connection.accountName,
      accountType: connection.accountType,
      accountMask: connection.accountMask,
      currency: connection.currency,
      status: connection.status,
      lastSyncAt: connection.lastSyncAt,
      tokenExpiresAt: connection.tokenExpiresAt,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    });
  }

  async getConnections(request: AuthenticatedRequest, reply: FastifyReply) {
    const { workspaceId } = request.params as { workspaceId: string };
    const { limit, offset } = request.query as {
      limit?: string;
      offset?: string;
    };

    const result = await this.getBankConnectionsHandler.handle({
      workspaceId,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });

    return reply.send({
      connections: result.items.map((c) => ({
        id: c.getId().getValue(),
        workspaceId: c.getWorkspaceId().getValue(),
        userId: c.getUserId().getValue(),
        institutionId: c.getInstitutionId(),
        institutionName: c.getInstitutionName(),
        accountId: c.getAccountId(),
        accountName: c.getAccountName(),
        accountType: c.getAccountType(),
        accountMask: c.getAccountMask(),
        currency: c.getCurrency(),
        status: c.getStatus(),
        lastSyncAt: c.getLastSyncAt(),
        tokenExpiresAt: c.getTokenExpiresAt(),
        errorMessage: c.getErrorMessage(),
        createdAt: c.getCreatedAt(),
        updatedAt: c.getUpdatedAt(),
      })),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    });
  }

  async getConnection(request: AuthenticatedRequest, reply: FastifyReply) {
    const { workspaceId, connectionId } = request.params as {
      workspaceId: string;
      connectionId: string;
    };

    const connection = await this.bankConnectionService.getConnection(
      workspaceId,
      connectionId,
    );

    return reply.send({
      id: connection.getId().getValue(),
      workspaceId: connection.getWorkspaceId().getValue(),
      userId: connection.getUserId().getValue(),
      institutionId: connection.getInstitutionId(),
      institutionName: connection.getInstitutionName(),
      accountId: connection.getAccountId(),
      accountName: connection.getAccountName(),
      accountType: connection.getAccountType(),
      accountMask: connection.getAccountMask(),
      currency: connection.getCurrency(),
      status: connection.getStatus(),
      lastSyncAt: connection.getLastSyncAt(),
      tokenExpiresAt: connection.getTokenExpiresAt(),
      errorMessage: connection.getErrorMessage(),
      createdAt: connection.getCreatedAt(),
      updatedAt: connection.getUpdatedAt(),
    });
  }

  async updateConnectionToken(
    request: AuthenticatedRequest,
    reply: FastifyReply,
  ) {
    const { workspaceId, connectionId } = request.params as {
      workspaceId: string;
      connectionId: string;
    };

    const bodyResult = updateConnectionTokenSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: "Invalid request body",
        details: bodyResult.error.errors,
      });
    }

    const body = bodyResult.data;

    const connection = await this.updateConnectionTokenHandler.handle({
      workspaceId,
      connectionId,
      accessToken: body.accessToken,
      tokenExpiresAt: body.tokenExpiresAt
        ? new Date(body.tokenExpiresAt)
        : undefined,
    });

    return reply.send({
      id: connection.getId().getValue(),
      status: connection.getStatus(),
      tokenExpiresAt: connection.getTokenExpiresAt(),
      updatedAt: connection.getUpdatedAt(),
    });
  }

  async disconnectBank(request: AuthenticatedRequest, reply: FastifyReply) {
    const { workspaceId, connectionId } = request.params as {
      workspaceId: string;
      connectionId: string;
    };

    await this.disconnectBankHandler.handle({
      workspaceId,
      connectionId,
    });

    return reply.status(204).send();
  }

  async deleteConnection(request: AuthenticatedRequest, reply: FastifyReply) {
    const { workspaceId, connectionId } = request.params as {
      workspaceId: string;
      connectionId: string;
    };

    await this.bankConnectionService.deleteConnection(
      workspaceId,
      connectionId,
    );

    return reply.status(204).send();
  }
}
