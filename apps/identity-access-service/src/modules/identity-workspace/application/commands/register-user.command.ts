import { UserManagementService } from '../services/user-management.service';
import { UserDTO } from '../../domain/entities/user.entity';
import bcrypt from 'bcryptjs';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface RegisterUserCommand extends ICommand {
  readonly email: string;
  readonly password: string;
  readonly fullName?: string;
}

export class RegisterUserHandler implements ICommandHandler<
  RegisterUserCommand,
  CommandResult<UserDTO>
> {
  constructor(private readonly userManagementService: UserManagementService) {}

  async handle(
    command: RegisterUserCommand
  ): Promise<CommandResult<UserDTO>> {
    try {
      const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
      const passwordHash = await bcrypt.hash(command.password, bcryptRounds);

      const userDTO = await this.userManagementService.createUserDTO({
        email: command.email,
        passwordHash,
        fullName: command.fullName,
      });
      return CommandResult.success(userDTO);
    } catch (error) {
      return CommandResult.fromError(error);
    }
  }
}
