import { UserManagementService } from '../services/user-management.service';
import bcrypt from 'bcryptjs';

import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

// Register User Command
export interface RegisterUserCommand extends ICommand {
  email: string;
  password: string;
  fullName?: string;
}

export class RegisterUserHandler implements ICommandHandler<
  RegisterUserCommand,
  CommandResult<{ userId: string }>
> {
  constructor(private readonly userManagementService: UserManagementService) {}

  async handle(
    command: RegisterUserCommand
  ): Promise<CommandResult<{ userId: string }>> {
    try {
      const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
      const passwordHash = await bcrypt.hash(command.password, bcryptRounds);

      const user = await this.userManagementService.createUser({
        email: command.email,
        passwordHash,
        fullName: command.fullName,
      });
      return CommandResult.success({ userId: user.getId().getValue() });
    } catch (error) {
      return CommandResult.fromError(error);
    }
  }
}
