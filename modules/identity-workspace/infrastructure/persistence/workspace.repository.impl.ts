import { PrismaClient, Prisma } from "@prisma/client";
import {
  IWorkspaceRepository,
  WorkspaceQueryOptions,
} from "../../domain/repositories/workspace.repository";
import { Workspace } from "../../domain/entities/workspace.entity";
import { WorkspaceId } from "../../domain/value-objects/workspace-id.vo";
import { UserId } from "../../domain/value-objects/user-id.vo";
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { IEventBus } from '../../../../packages/core/src/domain/events/domain-event';

export class WorkspaceRepositoryImpl
  extends PrismaRepository<Workspace>
  implements IWorkspaceRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(workspace: Workspace): Promise<void> {
    await this.prisma.workspace.create({
      data: {
        id: workspace.id.getValue(),
        name: workspace.name,
        slug: workspace.slug,
        ownerId: workspace.ownerId.getValue(),
        isActive: workspace.isActive,
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
      },
    });
    await this.dispatchEvents(workspace);
  }

  async findById(id: WorkspaceId): Promise<Workspace | null> {
    const row = await this.prisma.workspace.findUnique({
      where: { id: id.getValue() },
    });

    if (!row) {
      return null;
    }

    return Workspace.fromPersistence({
      id: row.id,
      name: row.name,
      slug: row.slug,
      ownerId: row.ownerId,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async findBySlug(slug: string): Promise<Workspace | null> {
    const row = await this.prisma.workspace.findUnique({
      where: { slug },
    });

    if (!row) {
      return null;
    }

    return Workspace.fromPersistence({
      id: row.id,
      name: row.name,
      slug: row.slug,
      ownerId: row.ownerId,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async findByOwnerId(
    ownerId: UserId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Workspace>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.workspace,
      {
        where: { ownerId: ownerId.getValue() },
        orderBy: { createdAt: "desc" },
      },
      (row) =>
        Workspace.fromPersistence({
          id: row.id,
          name: row.name,
          slug: row.slug,
          ownerId: row.ownerId,
          isActive: row.isActive,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        }),
      options,
    );
  }

  async findAll(
    options?: WorkspaceQueryOptions,
  ): Promise<PaginatedResult<Workspace>> {
    const {
      isActive,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = options || {};

    const where: Prisma.WorkspaceWhereInput = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const orderBy: Prisma.WorkspaceOrderByWithRelationInput = {};
    if (sortBy === "name") {
      orderBy.name = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    return PrismaRepositoryHelper.paginate(
      this.prisma.workspace,
      { where, orderBy },
      (row) =>
        Workspace.fromPersistence({
          id: row.id,
          name: row.name,
          slug: row.slug,
          ownerId: row.ownerId,
          isActive: row.isActive,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        }),
      options,
    );
  }

  async update(workspace: Workspace): Promise<void> {
    await this.prisma.workspace.update({
      where: { id: workspace.id.getValue() },
      data: {
        name: workspace.name,
        slug: workspace.slug,
        isActive: workspace.isActive,
        updatedAt: workspace.updatedAt,
      },
    });
    await this.dispatchEvents(workspace);
  }

  async delete(id: WorkspaceId): Promise<void> {
    await this.prisma.workspace.delete({
      where: { id: id.getValue() },
    });
  }

  async exists(id: WorkspaceId): Promise<boolean> {
    const count = await this.prisma.workspace.count({
      where: { id: id.getValue() },
    });
    return count > 0;
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const count = await this.prisma.workspace.count({
      where: { slug },
    });
    return count > 0;
  }

  async count(): Promise<number> {
    return await this.prisma.workspace.count();
  }
}
