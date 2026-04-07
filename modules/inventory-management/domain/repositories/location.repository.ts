import { Location } from '../entities/location.entity';
import { LocationId } from '../value-objects/location-id.vo';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export interface ILocationRepository {
  save(location: Location): Promise<void>;
  findById(id: LocationId, workspaceId: string): Promise<Location | null>;
  findByWorkspace(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Location>>;
  delete(id: LocationId, workspaceId: string): Promise<void>;
  exists(id: LocationId, workspaceId: string): Promise<boolean>;
  existsByName(name: string, workspaceId: string): Promise<boolean>;
}
