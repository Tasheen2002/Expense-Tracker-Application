import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { CreateLocationHandler } from '../../../application/commands/create-location.command';
import { UpdateLocationHandler } from '../../../application/commands/update-location.command';
import { DeleteLocationHandler } from '../../../application/commands/delete-location.command';
import { GetLocationHandler } from '../../../application/queries/get-location.query';
import { ListLocationsHandler } from '../../../application/queries/list-locations.query';
import { LocationType } from '../../../domain/enums/location-type';
import { ResponseHelper } from '@shared/response.helper';

export class LocationController {
  constructor(
    private readonly createLocationHandler: CreateLocationHandler,
    private readonly updateLocationHandler: UpdateLocationHandler,
    private readonly deleteLocationHandler: DeleteLocationHandler,
    private readonly getLocationHandler: GetLocationHandler,
    private readonly listLocationsHandler: ListLocationsHandler
  ) {}

  async createLocation(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Body: { name: string; type?: string; address?: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const result = await this.createLocationHandler.handle({
        workspaceId,
        name: request.body.name,
        type: request.body.type as LocationType | undefined,
        address: request.body.address,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Location created successfully',
        result.data,
        201
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updateLocation(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; locationId: string };
      Body: { name?: string; type?: string; address?: string | null };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, locationId } = request.params;
      const result = await this.updateLocationHandler.handle({
        locationId,
        workspaceId,
        name: request.body.name,
        type: request.body.type as LocationType | undefined,
        address: request.body.address,
      });
      return ResponseHelper.fromCommand(reply, result, 'Location updated successfully');
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteLocation(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; locationId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, locationId } = request.params;
      const result = await this.deleteLocationHandler.handle({
        locationId,
        workspaceId,
      });
      if (!result.success) {
        return ResponseHelper.fromCommand(reply, result, 'Location deletion failed');
      }
      return reply.status(204).send();
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getLocation(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; locationId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, locationId } = request.params;
      const result = await this.getLocationHandler.handle({
        locationId,
        workspaceId,
      });
      return ResponseHelper.fromQuery(reply, result, 'Location retrieved successfully');
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listLocations(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: { limit?: string; offset?: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { limit, offset } = request.query;
      const result = await this.listLocationsHandler.handle({
        workspaceId,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      });
      return ResponseHelper.fromQuery(reply, result, 'Locations retrieved successfully');
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
