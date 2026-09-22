import { ILocationRepository } from '../../domain/repositories/location.repository';
import { Location, LocationDTO } from '../../domain/entities/location.entity';
import { LocationId } from '../../domain/value-objects/location-id.vo';
import { LocationType } from '../../domain/enums/location-type';
import {
  LocationNotFoundError,
  LocationAlreadyExistsError,
} from '../../domain/errors/inventory.errors';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export class LocationService {
  constructor(private readonly locationRepository: ILocationRepository) {}

  async createLocation(params: {
    workspaceId: string;
    name: string;
    type?: LocationType;
    address?: string;
  }): Promise<LocationDTO> {
    const nameExists = await this.locationRepository.existsByName(
      params.name,
      params.workspaceId
    );
    if (nameExists) {
      throw new LocationAlreadyExistsError(params.name, params.workspaceId);
    }

    const location = Location.create(params);
    await this.locationRepository.save(location);
    return Location.toDTO(location);
  }

  async updateLocation(
    locationId: string,
    workspaceId: string,
    updates: {
      name?: string;
      type?: LocationType;
      address?: string | null;
    }
  ): Promise<LocationDTO> {
    const location = await this.locationRepository.findById(
      LocationId.fromString(locationId),
      workspaceId
    );
    if (!location) {
      throw new LocationNotFoundError(locationId, workspaceId);
    }

    if (updates.name !== undefined) {
      if (updates.name !== location.name) {
        const nameExists = await this.locationRepository.existsByName(
          updates.name,
          workspaceId
        );
        if (nameExists) {
          throw new LocationAlreadyExistsError(updates.name, workspaceId);
        }
      }
      location.updateName(updates.name);
    }
    if (updates.type !== undefined) {
      location.updateType(updates.type);
    }
    if (updates.address !== undefined) {
      location.updateAddress(updates.address);
    }

    await this.locationRepository.save(location);
    return Location.toDTO(location);
  }

  async deleteLocation(locationId: string, workspaceId: string): Promise<void> {
    const location = await this.locationRepository.findById(
      LocationId.fromString(locationId),
      workspaceId
    );
    if (!location) {
      throw new LocationNotFoundError(locationId, workspaceId);
    }
    location.markAsDeleted();
    await this.locationRepository.delete(
      LocationId.fromString(locationId),
      workspaceId
    );
  }

  async getLocationById(
    locationId: string,
    workspaceId: string
  ): Promise<LocationDTO | null> {
    const location = await this.locationRepository.findById(
      LocationId.fromString(locationId),
      workspaceId
    );
    return location ? Location.toDTO(location) : null;
  }

  async getLocationsByWorkspace(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<LocationDTO>> {
    const result = await this.locationRepository.findByWorkspace(workspaceId, options);
    return {
      items: result.items.map((l) => Location.toDTO(l)),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    };
  }
}
