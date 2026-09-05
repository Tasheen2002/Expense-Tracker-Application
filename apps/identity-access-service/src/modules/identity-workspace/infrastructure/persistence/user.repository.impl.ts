import { Prisma } from '@prisma/client';
import {
  IUserRepository,
  UserQueryOptions,
} from '../../domain/repositories/user.repository';
import { User } from '../../domain/entities/user.entity';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { Email } from '../../domain/value-objects/email.vo';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';

export class UserRepositoryImpl
  extends PrismaRepository<User>
  implements IUserRepository
{
  private toDomain(row: Prisma.UserAccountGetPayload<object>): User {
    return User.fromPersistence({
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

  async save(user: User): Promise<void> {
    await this.context.execute(async () => {
      const data = {
        email: user.email.getValue(),
        passwordHash: user.passwordHash,
        fullName: user.fullName,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        updatedAt: user.updatedAt,
      };

      await this.prisma.userAccount.upsert({
        where: { id: user.id.getValue() },
        create: {
          id: user.id.getValue(),
          createdAt: user.createdAt,
          ...data,
        },
        update: data,
      });

      await this.persistEvents(user);
    });
  }

  async findById(id: UserId): Promise<User | null> {
    const row = await this.prisma.userAccount.findUnique({
      where: { id: id.getValue() },
    });

    if (!row) {
      return null;
    }

    return this.toDomain(row);
  }

  async findByEmail(email: Email): Promise<User | null> {
    const row = await this.prisma.userAccount.findUnique({
      where: { email: email.getValue() },
    });

    if (!row) {
      return null;
    }

    return this.toDomain(row);
  }

  async findAll(options?: UserQueryOptions): Promise<PaginatedResult<User>> {
    const {
      isActive,
      emailVerified,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options || {};

    const where: Prisma.UserAccountWhereInput = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    if (emailVerified !== undefined) {
      where.emailVerified = emailVerified;
    }

    const orderBy: Prisma.UserAccountOrderByWithRelationInput[] = [];
    if (sortBy === 'email') {
      orderBy.push({ email: sortOrder });
    } else if (sortBy === 'fullName') {
      orderBy.push({ fullName: sortOrder });
    } else {
      orderBy.push({ createdAt: sortOrder });
    }
    orderBy.push({ id: 'asc' });

    return PrismaRepositoryHelper.paginate(
      this.prisma.userAccount,
      { where, orderBy },
      (row) => this.toDomain(row),
      options,
    );
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

  async sharesWorkspace(actorId: UserId, targetId: UserId): Promise<boolean> {
    const membership = await this.prisma.workspaceMembership.findFirst({
      where: {
        userId: targetId.getValue(),
        workspace: {
          isActive: true,
          members: {
            some: { userId: actorId.getValue() },
          },
        },
      },
      select: { id: true },
    });
    return membership !== null;
  }
}
