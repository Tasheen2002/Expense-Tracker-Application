import { LocationService } from '../services/location.service';
import { Location, LocationDTO } from '../../domain/entities/location.entity';
import { LocationType } from '../../domain/enums/location-type';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface CreateLocationCommand extends ICommand {
  workspaceId: string;
  name: string;
  type?: LocationType;
  address?: string;
}

export class CreateLocationHandler
  implements ICommandHandler<CreateLocationCommand, CommandResult<LocationDTO>>
{
  constructor(private readonly locationService: LocationService) {}

  async handle(command: CreateLocationCommand): Promise<CommandResult<LocationDTO>> {
    const location = await this.locationService.createLocation(command);
    return CommandResult.success(Location.toDTO(location));
  }
}
