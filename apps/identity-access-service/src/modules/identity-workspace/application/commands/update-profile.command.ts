import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';
import { UserManagementService } from '../services/user-management.service';
import { OperationService } from '../services/operation.service';
import { UserDTO } from '../../domain/entities/user.entity';
import { InsufficientPermissionsError } from '../../domain/errors/identity.errors';

export interface UpdateProfileCommand extends ICommand {
  readonly actorId: string;
  readonly userId: string;
  readonly fullName?: string | null;
  readonly email?: string;
}

export class UpdateProfileHandler implements ICommandHandler<UpdateProfileCommand, CommandResult<UserDTO>> {
  constructor(
    private readonly service: UserManagementService,
    private readonly operations: OperationService
  ) {}

  async handle(command: UpdateProfileCommand): Promise<CommandResult<UserDTO>> {
    const data = await this.operations.execute({ actorId: command.actorId }, async () => {
      if (command.actorId !== command.userId) {
        throw new InsufficientPermissionsError('update another user');
      }
      return this.service.updateUserDTO(command.userId, command);
    });
    return CommandResult.success(data);
  }
}
