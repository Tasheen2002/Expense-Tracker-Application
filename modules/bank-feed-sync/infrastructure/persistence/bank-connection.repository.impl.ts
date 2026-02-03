import { PrismaClient } from "@prisma/client";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { UserId } from "../../../identity-workspace/domain/value-objects/user-id.vo";
import { BankConnection } from "../../domain/entities/bank-connection.entity";
import { BankConnectionId } from "../../domain/value-objects/bank-connection-id";
import { IBankConnectionRepository } from "../../domain/repositories/bank-connection.repository";
import { ConnectionStatus } from "../../domain/enums/connection-status.enum";

export class PrismaBankConnectionRepository implements IBankConnectionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(connection: BankConnection): Promise<void> {
    const data = {
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
      accessToken: connection.getAccessToken(),
      status: connection.getStatus(),
      lastSyncAt: connection.getLastSyncAt(),
      tokenExpiresAt: connection.getTokenExpiresAt(),
      errorMessage: connection.getErrorMessage(),
      createdAt: connection.getCreatedAt(),
      updatedAt: connection.getUpdatedAt(),
    };

    await this.prisma.bankConnection.upsert({
      where: { id: connection.getId().getValue() },
      create: data,
      update: data,
    });
  }

  async findById(
    id: BankConnectionId,
    workspaceId: WorkspaceId,
  ): Promise<BankConnection | null> {
    const record = await this.prisma.bankConnection.findFirst({
      where: {
        id: id.getValue(),
        workspaceId: workspaceId.getValue(),
      },
    });

    return record ? this.toDomain(record) : null;
  }

  async findByInstitutionAndAccount(
    workspaceId: WorkspaceId,
    institutionId: string,
    accountId: string,
  ): Promise<BankConnection | null> {
    const record = await this.prisma.bankConnection.findFirst({
      where: {
        workspaceId: workspaceId.getValue(),
        institutionId,
        accountId,
        status: {
          not: ConnectionStatus.DISCONNECTED,
        },
      },
    });

    return record ? this.toDomain(record) : null;
  }

  async findByWorkspace(workspaceId: WorkspaceId): Promise<BankConnection[]> {
    const records = await this.prisma.bankConnection.findMany({
      where: {
        workspaceId: workspaceId.getValue(),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return records.map((r) => this.toDomain(r));
  }

  async findByUser(
    workspaceId: WorkspaceId,
    userId: UserId,
  ): Promise<BankConnection[]> {
    const records = await this.prisma.bankConnection.findMany({
      where: {
        workspaceId: workspaceId.getValue(),
        userId: userId.getValue(),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return records.map((r) => this.toDomain(r));
  }

  async delete(id: BankConnectionId, workspaceId: WorkspaceId): Promise<void> {
    await this.prisma.bankConnection.delete({
      where: {
        id: id.getValue(),
        workspaceId: workspaceId.getValue(),
      },
    });
  }

  private toDomain(record: any): BankConnection {
    return BankConnection.fromPersistence({
      id: BankConnectionId.fromString(record.id),
      workspaceId: WorkspaceId.fromString(record.workspaceId),
      userId: UserId.fromString(record.userId),
      institutionId: record.institutionId,
      institutionName: record.institutionName,
      accountId: record.accountId,
      accountName: record.accountName,
      accountType: record.accountType,
      accountMask: record.accountMask,
      currency: record.currency,
      accessToken: record.accessToken,
      status: record.status as ConnectionStatus,
      lastSyncAt: record.lastSyncAt,
      tokenExpiresAt: record.tokenExpiresAt,
      errorMessage: record.errorMessage,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
