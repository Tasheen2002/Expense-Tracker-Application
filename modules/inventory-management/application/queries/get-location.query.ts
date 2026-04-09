import { LocationService } from '../services/location.service';
import { LocationDTO } from '../../domain/entities/location.entity';
import { LocationNotFoundError } from '../../domain/errors/inventory.errors';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';

export interface GetLocationQuery extends IQuery {
  locationId: string;
  workspaceId: string;
}

export class GetLocationHandler
  implements IQueryHandler<GetLocationQuery, LocationDTO>
{
  constructor(private readonly locationService: LocationService) {}

  async handle(query: GetLocationQuery): Promise<LocationDTO> {
    const dto = await this.locationService.getLocationById(
      query.locationId,
      query.workspaceId
    );
    if (!dto) {
      throw new LocationNotFoundError(query.locationId, query.workspaceId);
    }
    return dto;
  }
}
