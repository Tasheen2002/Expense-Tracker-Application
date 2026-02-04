import { PrismaClient, Prisma } from "@prisma/client";
import {
  IWorkspaceRepository,
  WorkspaceQueryOptions,
} from "../../domain/repositories/workspace.repository";
import { Workspace } from "../../domain/entities/workspace.entity";
import { WorkspaceId } from "../../domain/value-objects/workspace-id.vo";
import { UserId } from "../../domain/value-objects/user-id.vo";
import { PaginatedResult } from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";
import { PrismaRepositoryHelper } from "../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.helper";

export class WorkspaceRepositoryImpl implements IWorkspaceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(workspace: Workspace): Promise<void> {
    const data = workspace.toDatabaseRow();
    await this.prisma.workspace.create({
      data: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        ownerId: data.owner_id,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    });
  }

  async findById(id: WorkspaceId): Promise<Workspace | null> {
    const row = await this.prisma.workspace.findUnique({
      where: { id: id.getValue() },
    });

    if (!row) {
      return null;
    }

    return Workspace.fromDatabaseRow({
      id: row.id,
      name: row.name,
      slug: row.slug,
      owner_id: row.ownerId,
      is_active: row.isActive,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    });
  }

  async findBySlug(slug: string): Promise<Workspace | null> {
    const row = await this.prisma.workspace.findUnique({
      where: { slug },
    });

    if (!row) {
      return null;
    }

    return Workspace.fromDatabaseRow({
      id: row.id,
      name: row.name,
      slug: row.slug,
      owner_id: row.ownerId,
      is_active: row.isActive,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    });
  }

  async findByOwnerId(ownerId: UserId): Promise<Workspace[]> {
    const rows = await this.prisma.workspace.findMany({
      where: { ownerId: ownerId.getValue() },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row) =>
      Workspace.fromDatabaseRow({
        id: row.id,
        name: row.name,
        slug: row.slug,
        owner_id: row.ownerId,
        is_active: row.isActive,
        created_at: row.createdAt,
        updated_at: row.updatedAt,
      }),
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
        Workspace.fromDatabaseRow({
          id: row.id,
          name: row.name,
          slug: row.slug,
          owner_id: row.ownerId,
          is_active: row.isActive,
          created_at: row.createdAt,
          updated_at: row.updatedAt,
        }),
      options,
    );
  }

  async update(workspace: Workspace): Promise<void> {
    const data = workspace.toDatabaseRow();
    await this.prisma.workspace.update({
      where: { id: data.id },
      data: {
        name: data.name,
        slug: data.slug,
        isActive: data.is_active,
        updatedAt: data.updated_at,
      },
    });
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
