import { UserManagementService } from '../services/user-management.service';
import { User } from '../../domain/entities/user.entity';
import { UserAlreadyExistsError } from '../../domain/errors/identity.errors';
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
  CommandResult<User>
> {
  constructor(private readonly userManagementService: UserManagementService) {}

  async handle(command: RegisterUserCommand): Promise<CommandResult<User>> {
    try {
      // Validate email
      if (!command.email || typeof command.email !== 'string') {
        return CommandResult.failure<User>('Email is required', ['email']);
      }

      // Validate password
      if (!command.password || typeof command.password !== 'string') {
        return CommandResult.failure<User>('Password is required', [
          'password',
        ]);
      }

      if (command.password.length < 8) {
        return CommandResult.failure<User>(
          'Password must be at least 8 characters',
          ['password']
        );
      }

      // Hash password
      const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
      const passwordHash = await bcrypt.hash(command.password, bcryptRounds);

      // Create user
      const userData = {
        email: command.email,
        passwordHash,
        fullName: command.fullName,
      };

      const user = await this.userManagementService.createUser(userData);
      return CommandResult.success<User>(user);
    } catch (error) {
      // Re-throw domain errors to be handled by controller/ResponseHelper
      if (error instanceof UserAlreadyExistsError) {
        throw error;
      }
      if (error instanceof Error) {
        return CommandResult.failure<User>('User registration failed', [
          error.message,
        ]);
      }

      return CommandResult.failure<User>(
        'An unexpected error occurred during user registration'
      );
    }
  }
}
