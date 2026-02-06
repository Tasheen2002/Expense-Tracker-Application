import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { UserId } from "../../../identity-workspace/domain/value-objects/user-id.vo";
import { BankConnection } from "../../domain/entities/bank-connection.entity";
import { BankConnectionId } from "../../domain/value-objects/bank-connection-id";
import { IBankConnectionRepository } from "../../domain/repositories/bank-connection.repository";
import {
  BankConnectionNotFoundError,
  BankConnectionAlreadyExistsError,
} from "../../domain/errors";
import {
  ConnectBankCommand,
  UpdateConnectionTokenCommand,
  DisconnectBankCommand,
} from "../commands";
import { GetBankConnectionsQuery } from "../queries";
import { PaginatedResult } from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export class BankConnectionService {
  constructor(
    private readonly connectionRepository: IBankConnectionRepository,
  ) {}

  async connectBank(command: ConnectBankCommand): Promise<BankConnection> {
    const workspaceId = WorkspaceId.fromString(command.workspaceId);
    const userId = UserId.fromString(command.userId);

    // Check if connection already exists
    const existingConnection =
      await this.connectionRepository.findByInstitutionAndAccount(
        workspaceId,
        command.institutionId,
        command.accountId,
      );

    if (existingConnection) {
      throw new BankConnectionAlreadyExistsError(
        command.institutionId,
        command.accountId,
      );
    }

    const connection = BankConnection.create(
      workspaceId,
      userId,
      command.institutionId,
      command.institutionName,
      command.accountId,
      command.accountName,
      command.accountType,
      command.currency,
      command.accessToken,
      command.accountMask,
      command.tokenExpiresAt,
    );

    // Activate connection immediately if token is valid
    connection.activate();

    await this.connectionRepository.save(connection);
    return connection;
  }

  async updateConnectionToken(
    command: UpdateConnectionTokenCommand,
  ): Promise<BankConnection> {
    const workspaceId = WorkspaceId.fromString(command.workspaceId);
    const connectionId = BankConnectionId.fromString(command.connectionId);

    const connection = await this.connectionRepository.findById(
      connectionId,
      workspaceId,
    );

    if (!connection) {
      throw new BankConnectionNotFoundError(command.connectionId);
    }

    connection.updateAccessToken(command.accessToken, command.tokenExpiresAt);
    await this.connectionRepository.save(connection);

    return connection;
  }

  async disconnectBank(command: DisconnectBankCommand): Promise<void> {
    const workspaceId = WorkspaceId.fromString(command.workspaceId);
    const connectionId = BankConnectionId.fromString(command.connectionId);

    const connection = await this.connectionRepository.findById(
      connectionId,
      workspaceId,
    );

    if (!connection) {
      throw new BankConnectionNotFoundError(command.connectionId);
    }

    connection.disconnect();
    await this.connectionRepository.save(connection);
  }

  async getConnections(
    query: GetBankConnectionsQuery,
  ): Promise<PaginatedResult<BankConnection>> {
    const workspaceId = WorkspaceId.fromString(query.workspaceId);
    const options = {
      limit: query.limit,
      offset: query.offset,
    };

    if (query.userId) {
      const userId = UserId.fromString(query.userId);
      return this.connectionRepository.findByUser(workspaceId, userId, options);
    }

    return this.connectionRepository.findByWorkspace(workspaceId, options);
  }

  async getConnection(
    workspaceId: string,
    connectionId: string,
  ): Promise<BankConnection> {
    const wsId = WorkspaceId.fromString(workspaceId);
    const connId = BankConnectionId.fromString(connectionId);

    const connection = await this.connectionRepository.findById(connId, wsId);

    if (!connection) {
      throw new BankConnectionNotFoundError(connectionId);
    }

    return connection;
  }

  async deleteConnection(
    workspaceId: string,
    connectionId: string,
  ): Promise<void> {
    const wsId = WorkspaceId.fromString(workspaceId);
    const connId = BankConnectionId.fromString(connectionId);

    const connection = await this.connectionRepository.findById(connId, wsId);

    if (!connection) {
      throw new BankConnectionNotFoundError(connectionId);
    }

    await this.connectionRepository.delete(connId, wsId);
  }
}
