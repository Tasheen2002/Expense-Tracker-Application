import { PrismaClient, Prisma } from "@prisma/client";
import {
  IUserRepository,
  UserQueryOptions,
} from "../../domain/repositories/user.repository";
import { User } from "../../domain/entities/user.entity";
import { UserId } from "../../domain/value-objects/user-id.vo";
import { Email } from "../../domain/value-objects/email.vo";
import { PrismaRepository } from "../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.base";
import { IEventBus } from "../../../../apps/api/src/shared/domain/events/domain-event";
import { PaginatedResult } from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";
import { PrismaRepositoryHelper } from "../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.helper";

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
    const data = user.toDatabaseRow();
    await this.prisma.userAccount.create({
      data: {
        id: data.id,
        email: data.email,
        passwordHash: data.password_hash,
        fullName: data.full_name,
        isActive: data.is_active,
        emailVerified: data.email_verified,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
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

    return User.fromDatabaseRow({
      id: row.id,
      email: row.email,
      password_hash: row.passwordHash,
      full_name: row.fullName,
      is_active: row.isActive,
      email_verified: row.emailVerified,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    });
  }

  async findByEmail(email: Email): Promise<User | null> {
    const row = await this.prisma.userAccount.findUnique({
      where: { email: email.getValue() },
    });

    if (!row) {
      return null;
    }

    return User.fromDatabaseRow({
      id: row.id,
      email: row.email,
      password_hash: row.passwordHash,
      full_name: row.fullName,
      is_active: row.isActive,
      email_verified: row.emailVerified,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
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
        User.fromDatabaseRow({
          id: row.id,
          email: row.email,
          password_hash: row.passwordHash,
          full_name: row.fullName,
          is_active: row.isActive,
          email_verified: row.emailVerified,
          created_at: row.createdAt,
          updated_at: row.updatedAt,
        }),
      options,
    );
  }

  async update(user: User): Promise<void> {
    const data = user.toDatabaseRow();
    await this.prisma.userAccount.update({
      where: { id: data.id },
      data: {
        email: data.email,
        passwordHash: data.password_hash,
        fullName: data.full_name,
        isActive: data.is_active,
        emailVerified: data.email_verified,
        updatedAt: data.updated_at,
      },
    });
    await this.dispatchEvents(user);
  }

  async delete(id: UserId): Promise<void> {
    await this.prisma.userAccount.delete({
      where: { id: id.getValue() },
    });
    // Note: Deletion events typically require loading the entity first if we want to emit a domain event from it.
    // For now, we assume deletion is physical.
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
