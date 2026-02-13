import { UserManagementService } from "../services/user-management.service";
import { User } from "../../domain/entities/user.entity";
import { UserAlreadyExistsError } from "../../domain/errors/identity.errors";
import bcrypt from "bcryptjs";

// Command Result pattern
export class CommandResult<T> {
  private constructor(
    public readonly success: boolean,
    public readonly data?: T,
    public readonly error?: string,
    public readonly errors?: string[],
  ) {}

  static success<T>(data: T): CommandResult<T> {
    return new CommandResult(true, data, undefined, undefined);
  }

  static failure<T = any>(error: string, errors?: string[]): CommandResult<T> {
    return new CommandResult<T>(false, undefined, error, errors);
  }
}

// Command interfaces
export interface ICommand {
  readonly commandId?: string;
  readonly timestamp?: Date;
}

export interface ICommandHandler<TCommand extends ICommand, TResult = any> {
  handle(command: TCommand): Promise<TResult>;
}

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
      if (!command.email || typeof command.email !== "string") {
        return CommandResult.failure<User>("Email is required", ["email"]);
      }

      // Validate password
      if (!command.password || typeof command.password !== "string") {
        return CommandResult.failure<User>("Password is required", [
          "password",
        ]);
      }

      if (command.password.length < 8) {
        return CommandResult.failure<User>(
          "Password must be at least 8 characters",
          ["password"],
        );
      }

      // Hash password
      const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || "10");
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
        return CommandResult.failure<User>("User registration failed", [
          error.message,
        ]);
      }

      return CommandResult.failure<User>(
        "An unexpected error occurred during user registration",
      );
    }
  }
}
