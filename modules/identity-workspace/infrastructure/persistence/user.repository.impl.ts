import { PrismaClient, Prisma } from "@prisma/client";
import {
  IUserRepository,
  UserQueryOptions,
} from "../../domain/repositories/user.repository";
import { User } from "../../domain/entities/user.entity";
import { UserId } from "../../domain/value-objects/user-id.vo";
import { Email } from "../../domain/value-objects/email.vo";
import { PrismaRepository } from '../../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.base';
import { IEventBus } from '../../../../packages/core/src/domain/events/domain-event';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '../../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.helper';

export class UserRepositoryImpl
  extends PrismaRepository<User>
  implements IUserRepository
{
  constructor(
    protected readonly prisma: PrismaClient,
    protected readonly eventBus: IEventBus,
  ) {
    super(prisma, eventBus);
  }

  async save(user: User): Promise<void> {
    await this.prisma.userAccount.create({
      data: {
        id: user.getId().getValue(),
        email: user.getEmail().getValue(),
        passwordHash: user.getPasswordHash(),
        fullName: user.getFullName(),
        isActive: user.getIsActive(),
        emailVerified: user.getEmailVerified(),
        createdAt: user.getCreatedAt(),
        updatedAt: user.getUpdatedAt(),
      },
    });
    await this.dispatchEvents(user);
  }

  async findById(id: UserId): Promise<User | null> {
    const row = await this.prisma.userAccount.findUnique({
      where: { id: id.getValue() },
    });

    if (!row) {
      return null;
    }

    return User.reconstitute({
      id: UserId.fromString(row.id),
      email: Email.create(row.email),
      passwordHash: row.passwordHash,
      fullName: row.fullName,
      isActive: row.isActive,
      emailVerified: row.emailVerified,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async findByEmail(email: Email): Promise<User | null> {
    const row = await this.prisma.userAccount.findUnique({
      where: { email: email.getValue() },
    });

    if (!row) {
      return null;
    }

    return User.reconstitute({
      id: UserId.fromString(row.id),
      email: Email.create(row.email),
      passwordHash: row.passwordHash,
      fullName: row.fullName,
      isActive: row.isActive,
      emailVerified: row.emailVerified,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async findAll(options?: UserQueryOptions): Promise<PaginatedResult<User>> {
    const {
      isActive,
      emailVerified,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = options || {};

    const where: Prisma.UserAccountWhereInput = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    if (emailVerified !== undefined) {
      where.emailVerified = emailVerified;
    }

    const orderBy: Prisma.UserAccountOrderByWithRelationInput = {};
    if (sortBy === "email") {
      orderBy.email = sortOrder;
    } else if (sortBy === "fullName") {
      orderBy.fullName = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    return PrismaRepositoryHelper.paginate(
      this.prisma.userAccount,
      { where, orderBy },
      (row) =>
        User.reconstitute({
          id: UserId.fromString(row.id),
          email: Email.create(row.email),
          passwordHash: row.passwordHash,
          fullName: row.fullName,
          isActive: row.isActive,
          emailVerified: row.emailVerified,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        }),
      options,
    );
  }

  async update(user: User): Promise<void> {
    await this.prisma.userAccount.update({
      where: { id: user.getId().getValue() },
      data: {
        email: user.getEmail().getValue(),
        passwordHash: user.getPasswordHash(),
        fullName: user.getFullName(),
        isActive: user.getIsActive(),
        emailVerified: user.getEmailVerified(),
        updatedAt: user.getUpdatedAt(),
      },
    });
    await this.dispatchEvents(user);
  }

  async delete(id: UserId): Promise<void> {
    await this.prisma.userAccount.delete({
      where: { id: id.getValue() },
    });
  }

  async exists(id: UserId): Promise<boolean> {
    const count = await this.prisma.userAccount.count({
      where: { id: id.getValue() },
    });
    return count > 0;
  }

  async existsByEmail(email: Email): Promise<boolean> {
    const count = await this.prisma.userAccount.count({
      where: { email: email.getValue() },
    });
    return count > 0;
  }

  async count(): Promise<number> {
    return await this.prisma.userAccount.count();
  }
}
