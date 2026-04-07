import { PrismaClient, Prisma } from '@prisma/client';
import { Location } from '../../domain/entities/location.entity';
import { LocationId } from '../../domain/value-objects/location-id.vo';
import { LocationType } from '../../domain/enums/location-type';
import { ILocationRepository } from '../../domain/repositories/location.repository';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { IEventBus } from '../../../../packages/core/src/domain/events/domain-event';

export class LocationRepositoryImpl
  extends PrismaRepository<Location>
  implements ILocationRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(location: Location): Promise<void> {
    await this.prisma.location.upsert({
      where: { id: location.id.getValue() },
      create: {
        id: location.id.getValue(),
        workspaceId: location.workspaceId,
        name: location.name,
        type: location.type,
        address: location.address,
        isActive: location.isActive,
        createdAt: location.createdAt,
        updatedAt: location.updatedAt,
      },
      update: {
        name: location.name,
        type: location.type,
        address: location.address,
        isActive: location.isActive,
        updatedAt: location.updatedAt,
      },
    });

    await this.dispatchEvents(location);
  }

  async findById(id: LocationId, workspaceId: string): Promise<Location | null> {
    const row = await this.prisma.location.findFirst({
      where: { id: id.getValue(), workspaceId },
    });
    if (!row) return null;
    return this.toDomain(row);
  }

  async findByWorkspace(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Location>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.location,
      { where: { workspaceId }, orderBy: { createdAt: 'desc' } },
      (record) => this.toDomain(record),
      options
    );
  }

  async delete(id: LocationId, workspaceId: string): Promise<void> {
    await this.prisma.location.delete({
      where: { id: id.getValue(), workspaceId },
    });
  }

  async exists(id: LocationId, workspaceId: string): Promise<boolean> {
    const count = await this.prisma.location.count({
      where: { id: id.getValue(), workspaceId },
    });
    return count > 0;
  }

  async existsByName(name: string, workspaceId: string): Promise<boolean> {
    const count = await this.prisma.location.count({
      where: { name, workspaceId },
    });
    return count > 0;
  }

  private toDomain(row: Prisma.LocationGetPayload<object>): Location {
    return Location.fromPersistence({
      id: LocationId.fromString(row.id),
      workspaceId: row.workspaceId,
      name: row.name,
      type: row.type as LocationType,
      address: row.address,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
