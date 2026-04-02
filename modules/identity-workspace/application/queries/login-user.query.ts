import { UserManagementService } from '../services/user-management.service';
import {
  InvalidCredentialsError,
  UserInactiveError,
} from '../../domain/errors/identity.errors';
import { IQuery, IQueryHandler } from '../../../../apps/api/src/shared/application/cqrs';
import { QueryResult } from '../../../../apps/api/src/shared/application/query-result';

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
  QueryResult<LoginUserResult>
> {
  constructor(private readonly userManagementService: UserManagementService) {}

  async handle(query: LoginUserQuery): Promise<QueryResult<LoginUserResult>> {
    try {
      const user = await this.userManagementService.verifyPassword(
        query.email,
        query.password
      );

      if (!user) {
        throw new InvalidCredentialsError();
      }

      if (!user.getIsActive()) {
        throw new UserInactiveError();
      }

      return QueryResult.success<LoginUserResult>({
        userId: user.getId().getValue(),
        email: user.getEmail().getValue(),
        fullName: user.getFullName(),
        isActive: user.getIsActive(),
        emailVerified: user.getEmailVerified(),
      });
    } catch (error) {
      return QueryResult.fromError(error);
    }
  }
}
