import { PrismaClient, Prisma } from '../../../../prisma-client';
import { WorkspaceId, UserId } from '@core/domain/value-objects';
import { BankConnection } from '../../domain/entities/bank-connection.entity';
import { BankConnectionId } from '../../domain/value-objects/bank-connection-id';
import { IBankConnectionRepository } from '../../domain/repositories/bank-connection.repository';
import { ConnectionStatus } from '../../domain/enums/connection-status.enum';
import {
  BankConnectionAlreadyExistsError,
  BankFeedSyncDomainError,
} from '../../domain/errors/bank-feed-sync.errors';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { IEventBus } from '@core/domain/events/domain-event';
import { BankTokenCipher } from '@shared/infrastructure/security/bank-token-cipher';

export class PrismaBankConnectionRepository
  extends PrismaRepository<BankConnection>
  implements IBankConnectionRepository
{
  private readonly tokenCipher: BankTokenCipher;

  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
    this.tokenCipher = new BankTokenCipher(
      process.env.BANK_FEED_TOKEN_ENCRYPTION_KEY
    );
  }

  async save(connection: BankConnection): Promise<void> {
    const data = this.toPersistence(connection);
    const nextVersion = connection.isPersisted
      ? connection.version + 1
      : connection.version;

    try {
      await this.prisma.$transaction(async (tx) => {
        if (connection.isPersisted) {
          const { id, workspaceId, createdAt, version, ...mutable } = data;
          const result = await tx.bankConnection.updateMany({
            where: { id, workspaceId, version },
            data: { ...mutable, version: { increment: 1 } },
          });
          if (result.count !== 1) {
            throw new BankFeedSyncDomainError(
              'Bank connection changed concurrently',
              'CONCURRENT_CONNECTION_MODIFICATION',
              409
            );
          }
        } else {
          await tx.bankConnection.create({ data });
        }
        await this.persistOutboxEvents(tx, [connection]);
      });
      this.clearPersistedEvents([connection]);
      connection.markPersisted(nextVersion);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BankConnectionAlreadyExistsError(
          connection.institutionId,
          connection.accountId
        );
      }
      throw error;
    }
  }

  async recordSyncSuccess(connection: BankConnection): Promise<boolean> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.bankConnection.updateMany({
        where: {
          id: connection.id.getValue(),
          workspaceId: connection.workspaceId.getValue(),
          status: ConnectionStatus.CONNECTED,
          version: connection.version,
        },
        data: {
          lastSyncAt: connection.lastSyncAt,
          updatedAt: connection.updatedAt,
          version: { increment: 1 },
        },
      });
      if (result.count) await this.persistOutboxEvents(tx, [connection]);
      return result.count > 0;
    });
    this.clearPersistedEvents([connection]);
    if (updated) connection.markPersisted(connection.version + 1);
    return updated;
  }

  async recordSyncFailure(connection: BankConnection): Promise<boolean> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.bankConnection.updateMany({
        where: {
          id: connection.id.getValue(),
          workspaceId: connection.workspaceId.getValue(),
          status: ConnectionStatus.CONNECTED,
          version: connection.version,
        },
        data: {
          status: ConnectionStatus.ERROR,
          errorMessage: connection.errorMessage,
          updatedAt: connection.updatedAt,
          version: { increment: 1 },
        },
      });
      if (result.count) await this.persistOutboxEvents(tx, [connection]);
      return result.count > 0;
    });
    this.clearPersistedEvents([connection]);
    if (updated) connection.markPersisted(connection.version + 1);
    return updated;
  }

  async findById(
    id: BankConnectionId,
    workspaceId: WorkspaceId
  ): Promise<BankConnection | null> {
    const record = await this.prisma.bankConnection.findFirst({
      where: {
        id: id.getValue(),
        workspaceId: workspaceId.getValue(),
        status: { not: ConnectionStatus.DELETED },
      },
    });

    return record ? this.toDomain(record) : null;
  }

  async findByInstitutionAndAccount(
    workspaceId: WorkspaceId,
    institutionId: string,
    accountId: string
  ): Promise<BankConnection | null> {
    const record = await this.prisma.bankConnection.findFirst({
      where: {
        workspaceId: workspaceId.getValue(),
        institutionId,
        accountId,
      },
    });

    return record ? this.toDomain(record) : null;
  }

  async findByWorkspace(
    workspaceId: WorkspaceId,
    options?: PaginationOptions
  ): Promise<PaginatedResult<BankConnection>> {
    const where: Prisma.BankConnectionWhereInput = {
      workspaceId: workspaceId.getValue(),
      status: { not: ConnectionStatus.DELETED },
    };

    return PrismaRepositoryHelper.paginate(
      (page) =>
        this.prisma.bankConnection.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          ...page,
        }),
      () => this.prisma.bankConnection.count({ where }),
      (record) => this.toDomain(record),
      options
    );
  }

  async findByUser(
    workspaceId: WorkspaceId,
    userId: UserId,
    options?: PaginationOptions
  ): Promise<PaginatedResult<BankConnection>> {
    const where: Prisma.BankConnectionWhereInput = {
      workspaceId: workspaceId.getValue(),
      userId: userId.getValue(),
      status: { not: ConnectionStatus.DELETED },
    };

    return PrismaRepositoryHelper.paginate(
      (page) =>
        this.prisma.bankConnection.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          ...page,
        }),
      () => this.prisma.bankConnection.count({ where }),
      (record) => this.toDomain(record),
      options
    );
  }

  private toPersistence(
    connection: BankConnection
  ): Prisma.BankConnectionUncheckedCreateInput {
    return {
      id: connection.id.getValue(),
      workspaceId: connection.workspaceId.getValue(),
      userId: connection.userId.getValue(),
      institutionId: connection.institutionId,
      institutionName: connection.institutionName,
      accountId: connection.accountId,
      accountName: connection.accountName,
      accountType: connection.accountType,
      accountMask: connection.accountMask ?? null,
      currency: connection.currency,
      accessToken: this.tokenCipher.encrypt(
        connection.accessTokenForSync,
        connection.id.getValue(),
        connection.workspaceId.getValue()
      ),
      status: connection.status,
      lastSyncAt: connection.lastSyncAt ?? null,
      tokenExpiresAt: connection.tokenExpiresAt ?? null,
      errorMessage: connection.errorMessage ?? null,
      version: connection.version,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    };
  }

  private toDomain(
    record: Prisma.BankConnectionGetPayload<object>
  ): BankConnection {
    return BankConnection.fromPersistence({
      id: BankConnectionId.fromString(record.id),
      workspaceId: WorkspaceId.fromString(record.workspaceId),
      userId: UserId.fromString(record.userId),
      institutionId: record.institutionId,
      institutionName: record.institutionName,
      accountId: record.accountId,
      accountName: record.accountName,
      accountType: record.accountType,
      accountMask: record.accountMask ?? undefined,
      currency: record.currency,
      accessToken: this.tokenCipher.decrypt(
        record.accessToken,
        record.id,
        record.workspaceId
      ),
      status: record.status as ConnectionStatus,
      lastSyncAt: record.lastSyncAt ?? undefined,
      tokenExpiresAt: record.tokenExpiresAt ?? undefined,
      errorMessage: record.errorMessage ?? undefined,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
