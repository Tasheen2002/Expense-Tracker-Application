import { UserManagementService } from '../services/user-management.service';
import {
  InvalidCredentialsError,
  UserInactiveError,
} from '../../domain/errors/identity.errors';
import { IQuery, IQueryHandler } from '../../../../packages/core/src/application/cqrs';

export interface LoginUserQuery extends IQuery {
  readonly email: string;
  readonly password: string;
}

export interface LoginUserResult {
  readonly userId: string;
  readonly email: string;
  readonly fullName: string | null;
  readonly isActive: boolean;
  readonly emailVerified: boolean;
}

export class LoginUserHandler implements IQueryHandler<
  LoginUserQuery,
  LoginUserResult
> {
  constructor(private readonly userManagementService: UserManagementService) {}

  async handle(query: LoginUserQuery): Promise<LoginUserResult> {
    const user = await this.userManagementService.verifyPassword(
      query.email,
      query.password
    );

    if (!user) {
      throw new InvalidCredentialsError();
    }

    if (!user.isActive) {
      throw new UserInactiveError();
    }

    return {
      userId: user.id.getValue(),
      email: user.email.getValue(),
      fullName: user.fullName,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
    };
  }
}
