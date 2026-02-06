import { PrismaClient, Prisma } from "@prisma/client";
import { CategoryRepository } from "../../domain/repositories/category.repository";
import { Category } from "../../domain/entities/category.entity";
import { CategoryId } from "../../domain/value-objects/category-id";
import { IEventBus } from "../../../../apps/api/src/shared/domain/events/domain-event";
import { PrismaRepositoryHelper } from "../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.helper";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export class CategoryRepositoryImpl implements CategoryRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: IEventBus,
  ) {}

  async save(category: Category): Promise<void> {
    await this.prisma.category.create({
      data: {
        id: category.id.getValue(),
        workspaceId: category.workspaceId,
        name: category.name,
        description: category.description,
        color: category.color,
        icon: category.icon,
        isActive: category.isActive,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      },
    });

    // NOTE: Category does not extend AggregateRoot - no domain events to dispatch
  }

  async update(category: Category): Promise<void> {
    await this.prisma.category.update({
      where: {
        id: category.id.getValue(),
        workspaceId: category.workspaceId,
      },
      data: {
        name: category.name,
        description: category.description,
        color: category.color,
        icon: category.icon,
        isActive: category.isActive,
        updatedAt: category.updatedAt,
      },
    });

    // NOTE: Category does not extend AggregateRoot - no domain events to dispatch
  }

  async findById(
    id: CategoryId,
    workspaceId: string,
  ): Promise<Category | null> {
    const category = await this.prisma.category.findUnique({
      where: {
        id: id.getValue(),
        workspaceId,
      },
    });

    if (!category) return null;

    return this.toDomain(category);
  }

  async findByName(
    name: string,
    workspaceId: string,
  ): Promise<Category | null> {
    const category = await this.prisma.category.findUnique({
      where: {
        workspaceId_name: {
          workspaceId,
          name,
        },
      },
    });

    if (!category) return null;

    return this.toDomain(category);
  }

  async findByWorkspace(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Category>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.category,
      {
        where: { workspaceId },
        orderBy: { name: "asc" },
      },
      (category) => this.toDomain(category),
      options,
    );
  }

  async findActiveByWorkspace(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Category>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.category,
      {
        where: {
          workspaceId,
          isActive: true,
        },
        orderBy: { name: "asc" },
      },
      (category) => this.toDomain(category),
      options,
    );
  }

  async delete(id: CategoryId, workspaceId: string): Promise<void> {
    await this.prisma.category.delete({
      where: {
        id: id.getValue(),
        workspaceId,
      },
    });
  }

  async exists(id: CategoryId, workspaceId: string): Promise<boolean> {
    const count = await this.prisma.category.count({
      where: {
        id: id.getValue(),
        workspaceId,
      },
    });
    return count > 0;
  }

  async existsByName(name: string, workspaceId: string): Promise<boolean> {
    const count = await this.prisma.category.count({
      where: {
        name,
        workspaceId,
      },
    });
    return count > 0;
  }

  private toDomain(data: Prisma.CategoryGetPayload<{}>): Category {
    return Category.fromPersistence({
      id: CategoryId.fromString(data.id),
      workspaceId: data.workspaceId,
      name: data.name,
      description: data.description ?? undefined,
      color: data.color ?? undefined,
      icon: data.icon ?? undefined,
      isActive: data.isActive,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
