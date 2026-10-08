import { PrismaClient, Prisma } from '@prisma/client';
import { Location } from '../../domain/entities/location.entity';
import { LocationId } from '../../domain/value-objects/location-id.vo';
import { LocationType } from '../../domain/enums/location-type';
import { ILocationRepository } from '../../domain/repositories/location.repository';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { IEventBus } from '@core/domain/events/domain-event';
import {
  LocationAlreadyExistsError,
  LocationInUseError,
  LocationNotFoundError,
} from '../../domain/errors/inventory.errors';

export class LocationRepositoryImpl
  extends PrismaRepository<Location>
  implements ILocationRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(location: Location): Promise<void> {
    try {
      await this.runInTransaction(async (tx) => {
        await tx.location.upsert({
          where: {
            id: location.id.getValue(),
            workspaceId: location.workspaceId,
          },
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
        await this.dispatchEvents(location, tx);
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const target = error.meta?.target;
        const fields = Array.isArray(target)
          ? target.map(String)
          : [String(target ?? '')];
        if (
          fields.some(
            (field) =>
              field === 'name' || field.includes('location_workspace_name')
          )
        ) {
          throw new LocationAlreadyExistsError(
            location.name,
            location.workspaceId
          );
        }
      }
      throw error;
    }
  }

  async findById(
    id: LocationId,
    workspaceId: string
  ): Promise<Location | null> {
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
      (page) =>
        this.prisma.location.findMany({
          where: { workspaceId },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          ...page,
        }),
      () => this.prisma.location.count({ where: { workspaceId } }),
      (record) => this.toDomain(record),
      options
    );
  }

  async delete(location: Location): Promise<void> {
    try {
      await this.runInTransaction(async (tx) => {
        await tx.location.delete({
          where: {
            id: location.id.getValue(),
            workspaceId: location.workspaceId,
          },
        });
        await this.dispatchEvents(location, tx);
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new LocationNotFoundError(
          location.id.getValue(),
          location.workspaceId
        );
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new LocationInUseError(location.id.getValue());
      }
      throw error;
    }
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
