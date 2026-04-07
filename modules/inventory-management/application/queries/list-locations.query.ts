import { ILocationRepository } from '../../domain/repositories/location.repository';
import { Location, LocationDTO } from '../../domain/entities/location.entity';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';
import { QueryResult } from '../../../../packages/core/src/application/query-result';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export interface ListLocationsQuery extends IQuery {
  workspaceId: string;
  limit?: number;
  offset?: number;
}

export class ListLocationsHandler
  implements IQueryHandler<ListLocationsQuery, QueryResult<PaginatedResult<LocationDTO>>>
{
  constructor(private readonly locationRepository: ILocationRepository) {}

  async handle(
    query: ListLocationsQuery
  ): Promise<QueryResult<PaginatedResult<LocationDTO>>> {
    const result = await this.locationRepository.findByWorkspace(
      query.workspaceId,
      { limit: query.limit, offset: query.offset }
    );

    const dtoResult: PaginatedResult<LocationDTO> = {
      items: result.items.map((l) => Location.toDTO(l)),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    };

    return QueryResult.success(dtoResult);
  }
}
