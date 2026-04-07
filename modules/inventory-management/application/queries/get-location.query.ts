import { ILocationRepository } from '../../domain/repositories/location.repository';
import { Location, LocationDTO } from '../../domain/entities/location.entity';
import { LocationId } from '../../domain/value-objects/location-id.vo';
import { LocationNotFoundError } from '../../domain/errors/inventory.errors';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';
import { QueryResult } from '../../../../packages/core/src/application/query-result';

export interface GetLocationQuery extends IQuery {
  locationId: string;
  workspaceId: string;
}

export class GetLocationHandler
  implements IQueryHandler<GetLocationQuery, QueryResult<LocationDTO>>
{
  constructor(private readonly locationRepository: ILocationRepository) {}

  async handle(query: GetLocationQuery): Promise<QueryResult<LocationDTO>> {
    const location = await this.locationRepository.findById(
      LocationId.fromString(query.locationId),
      query.workspaceId
    );
    if (!location) {
      throw new LocationNotFoundError(query.locationId, query.workspaceId);
    }
    return QueryResult.success(Location.toDTO(location));
  }
}
