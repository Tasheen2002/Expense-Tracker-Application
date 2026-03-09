import { UserManagementService } from '../services/user-management.service';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../apps/api/src/shared/application';

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
      // Validate email
      if (!query.email || typeof query.email !== 'string') {
        return QueryResult.failure<LoginUserResult>('Email is required');
      }

      // Validate password
      if (!query.password || typeof query.password !== 'string') {
        return QueryResult.failure<LoginUserResult>('Password is required');
      }

      // Verify credentials
      const user = await this.userManagementService.verifyPassword(
        query.email,
        query.password
      );

      if (!user) {
        return QueryResult.failure<LoginUserResult>(
          'Invalid email or password'
        );
      }

      // Check if user is active
      if (!user.getIsActive()) {
        return QueryResult.failure<LoginUserResult>('Account is deactivated');
      }

      const result: LoginUserResult = {
        userId: user.getId().getValue(),
        email: user.getEmail().getValue(),
        fullName: user.getFullName(),
        isActive: user.getIsActive(),
        emailVerified: user.getEmailVerified(),
      };

      return QueryResult.success<LoginUserResult>(result);
    } catch (error) {
      if (error instanceof Error) {
        return QueryResult.failure<LoginUserResult>(
          'Login failed: ' + error.message
        );
      }

      return QueryResult.failure<LoginUserResult>(
        'An unexpected error occurred during login'
      );
    }
  }
}
