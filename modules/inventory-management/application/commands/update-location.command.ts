import { LocationService } from '../services/location.service';
import { LocationDTO } from '../../domain/entities/location.entity';
import { LocationType } from '../../domain/enums/location-type';
import {
  ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';



export interface UpdateLocationCommand extends ICommand {
  readonly locationId: string;
  readonly workspaceId: string;
  readonly name?: string;
  readonly type?: LocationType;
  readonly address?: string | null;
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
    return CommandResult.success(location);
  }
}
