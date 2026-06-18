import { PrismaClient, Prisma } from "@prisma/client";
import { ITagRepository } from "../../domain/repositories/tag.repository";
import { Tag } from "../../domain/entities/tag.entity";
import { TagId } from "../../domain/value-objects/tag-id";
import { IEventBus } from '@core/domain/events/domain-event';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export class TagRepositoryImpl
  extends PrismaRepository<Tag>
  implements ITagRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(tag: Tag): Promise<void> {
    await this.prisma.tag.create({
      data: {
        id: tag.id.getValue(),
        workspaceId: tag.workspaceId,
        name: tag.name,
        color: tag.color,
        createdAt: tag.createdAt,
      },
    });

    await this.dispatchEvents(tag);
  }

  async update(tag: Tag): Promise<void> {
    await this.prisma.tag.update({
      where: {
        id: tag.id.getValue(),
        workspaceId: tag.workspaceId,
      },
      data: {
        name: tag.name,
        color: tag.color,
      },
    });

    await this.dispatchEvents(tag);
  }

  async findById(id: TagId, workspaceId: string): Promise<Tag | null> {
    const tag = await this.prisma.tag.findUnique({
      where: {
        id: id.getValue(),
        workspaceId,
      },
    });

    if (!tag) return null;

    return this.toDomain(tag);
  }

  async findByName(name: string, workspaceId: string): Promise<Tag | null> {
    const tag = await this.prisma.tag.findUnique({
      where: {
        workspaceId_name: {
          workspaceId,
          name,
        },
      },
    });

    if (!tag) return null;

    return this.toDomain(tag);
  }

  async findByWorkspace(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Tag>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.tag,
      {
        where: { workspaceId },
        orderBy: { name: "asc" },
      },
      (tag) => this.toDomain(tag),
      options,
    );
  }

  async findByIds(ids: TagId[], workspaceId: string): Promise<Tag[]> {
    const tags = await this.prisma.tag.findMany({
      where: {
        id: { in: ids.map((id) => id.getValue()) },
        workspaceId,
      },
    });

    return tags.map((tag) => this.toDomain(tag));
  }

  async delete(id: TagId, workspaceId: string): Promise<void> {
    await this.prisma.tag.delete({
      where: {
        id: id.getValue(),
        workspaceId,
      },
    });
  }

  async exists(id: TagId, workspaceId: string): Promise<boolean> {
    const count = await this.prisma.tag.count({
      where: {
        id: id.getValue(),
        workspaceId,
      },
    });
    return count > 0;
  }

  async existsByName(name: string, workspaceId: string): Promise<boolean> {
    const count = await this.prisma.tag.count({
      where: {
        name,
        workspaceId,
      },
    });
    return count > 0;
  }

  private toDomain(data: Prisma.TagGetPayload<{}>): Tag {
    return Tag.fromPersistence({
      id: TagId.fromString(data.id),
      workspaceId: data.workspaceId,
      name: data.name,
      color: data.color ?? undefined,
      createdAt: data.createdAt,
    });
  }
}
