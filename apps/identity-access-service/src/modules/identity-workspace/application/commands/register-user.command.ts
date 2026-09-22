import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';
import { UserManagementService } from '../services/user-management.service';
import { OperationService } from '../services/operation.service';
import { UserDTO } from '../../domain/entities/user.entity';
import { IPasswordHasher } from '../ports/password-hasher';

export interface RegisterUserCommand extends ICommand {
  readonly email: string;
  readonly password: string;
  readonly fullName?: string;
}
export class RegisterUserHandler implements ICommandHandler<RegisterUserCommand, CommandResult<UserDTO>> {
  constructor(
    private readonly service: UserManagementService,
    private readonly operations: OperationService,
    private readonly passwords: IPasswordHasher
  ) {}

  async handle(command: RegisterUserCommand): Promise<CommandResult<UserDTO>> {
    // Expensive hashing must not hold a database transaction open.
    const passwordHash = await this.passwords.hash(command.password);
    const data = await this.operations.register(() =>
      this.service.createUserDTO({ ...command, passwordHash })
    );
    return CommandResult.success(data);
  }
}
