import { LocationService } from '../services/location.service';
import {
  ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';



export interface DeleteLocationCommand extends ICommand {
  readonly locationId: string;
  readonly workspaceId: string;
}

export class DeleteLocationHandler
  implements ICommandHandler<DeleteLocationCommand, CommandResult<void>>
{
  constructor(private readonly locationService: LocationService) {}

  async handle(command: DeleteLocationCommand): Promise<CommandResult<void>> {
    await this.locationService.deleteLocation(command.locationId, command.workspaceId);
    return CommandResult.success(undefined);
  }
}
