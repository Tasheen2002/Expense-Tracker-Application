import { UserManagementService } from '../services/user-management.service';
import { UserDTO } from '../../domain/entities/user.entity';
import bcrypt from 'bcryptjs';

import { ICommand, ICommandHandler } from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

// Register User Command
export interface RegisterUserCommand extends ICommand {
  email: string;
  password: string;
  fullName?: string;
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
