import { UserManagementService } from '../services/user-management.service';
import { ISessionService } from '../services/session.service';
import {
  InvalidCredentialsError,
  UserInactiveError,
} from '../../domain/errors/identity.errors';
import { ICommand, ICommandHandler } from '@core/application/cqrs';

export interface LoginUserCommand extends ICommand {
  readonly email: string;
  readonly password: string;
}

export interface AuthenticatedUserResult {
  readonly userId: string;
  readonly email: string;
  readonly fullName: string | null;
  readonly isActive: boolean;
  readonly emailVerified: boolean;
}

export interface LoginUserResult {
  readonly user: AuthenticatedUserResult;
  readonly sessionId: string;
}

export class LoginUserHandler implements ICommandHandler<
  LoginUserCommand,
  LoginUserResult
> {
  constructor(
    private readonly userManagementService: UserManagementService,
    private readonly sessionService: ISessionService
  ) {}

  async handle(command: LoginUserCommand): Promise<LoginUserResult> {
    const user = await this.userManagementService.verifyPassword(
      command.email,
      command.password
    );

    if (!user) {
      throw new InvalidCredentialsError();
    }

    if (!user.isActive) {
      throw new UserInactiveError();
    }

    const session = await this.sessionService.createSession(user.id.getValue());
    return {
      user: {
        userId: user.id.getValue(),
        email: user.email.getValue(),
        fullName: user.fullName,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
      },
      sessionId: session.sessionId,
    };
  }
}
