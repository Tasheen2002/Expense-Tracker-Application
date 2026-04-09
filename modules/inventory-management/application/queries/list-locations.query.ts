import { LocationService } from '../services/location.service';
import { LocationDTO } from '../../domain/entities/location.entity';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export interface ListLocationsQuery extends IQuery {
  workspaceId: string;
  limit?: number;
  offset?: number;
}

export class ListLocationsHandler
  implements IQueryHandler<ListLocationsQuery, PaginatedResult<LocationDTO>>
{
  constructor(private readonly locationService: LocationService) {}

  async handle(query: ListLocationsQuery): Promise<PaginatedResult<LocationDTO>> {
    return this.locationService.getLocationsByWorkspace(
      query.workspaceId,
      { limit: query.limit, offset: query.offset }
    );
  }
}
