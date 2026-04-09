import { UserManagementService } from '../services/user-management.service';
import {
  InvalidCredentialsError,
  UserInactiveError,
} from '../../domain/errors/identity.errors';
import { IQuery, IQueryHandler } from '../../../../packages/core/src/application/cqrs';

// Login User Query
export interface LoginUserQuery extends IQuery {
  email: string;
  password: string;
}

export interface LoginUserResult {
  userId: string;
  email: string;
  fullName: string | null;
  isActive: boolean;
  emailVerified: boolean;
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
