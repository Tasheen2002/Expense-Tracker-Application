import { LocationService } from '../services/location.service';
import { Location, LocationDTO } from '../../domain/entities/location.entity';
import { LocationType } from '../../domain/enums/location-type';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface UpdateLocationCommand extends ICommand {
  locationId: string;
  workspaceId: string;
  name?: string;
  type?: LocationType;
  address?: string | null;
}

export class UpdateLocationHandler
  implements ICommandHandler<UpdateLocationCommand, CommandResult<LocationDTO>>
{
  constructor(private readonly locationService: LocationService) {}

  async handle(command: UpdateLocationCommand): Promise<CommandResult<LocationDTO>> {
    const location = await this.locationService.updateLocation(
      command.locationId,
      command.workspaceId,
      {
        name: command.name,
        type: command.type,
        address: command.address,
      }
    );
    return CommandResult.success(Location.toDTO(location));
  }
}
