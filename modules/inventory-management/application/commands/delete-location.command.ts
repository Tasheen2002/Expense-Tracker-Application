import { LocationService } from '../services/location.service';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface DeleteLocationCommand extends ICommand {
  locationId: string;
  workspaceId: string;
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
