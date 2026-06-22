import { LocationService } from '../services/location.service';
import { LocationDTO } from '../../domain/entities/location.entity';
import { LocationType } from '../../domain/enums/location-type';
import {
  ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';



export interface CreateLocationCommand extends ICommand {
  readonly workspaceId: string;
  readonly name: string;
  readonly type?: LocationType;
  readonly address?: string;
}

export class CreateLocationHandler
  implements ICommandHandler<CreateLocationCommand, CommandResult<LocationDTO>>
{
  constructor(private readonly locationService: LocationService) {}

  async handle(command: CreateLocationCommand): Promise<CommandResult<LocationDTO>> {
    const location = await this.locationService.createLocation(command);
    return CommandResult.success(location);
  }
}
