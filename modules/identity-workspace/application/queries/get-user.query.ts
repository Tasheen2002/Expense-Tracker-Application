import { UserManagementService } from '../services/user-management.service';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../apps/api/src/shared/application';

export interface GetUserQuery extends IQuery {
  userId?: string;
  email?: string;
}

export interface UserResult {
  userId: string;
  email: string;
  fullName: string | null;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class GetUserHandler implements IQueryHandler<
  GetUserQuery,
  QueryResult<UserResult>
> {
  constructor(private readonly userManagementService: UserManagementService) {}

  async handle(query: GetUserQuery): Promise<QueryResult<UserResult>> {
    try {
      // Validate that either userId or email is provided
      if (!query.userId && !query.email) {
        return QueryResult.failure<UserResult>(
          'Either userId or email is required'
        );
      }

      // Get user by ID or email
      let user;
      if (query.userId) {
        user = await this.userManagementService.getUserById(query.userId);
      } else if (query.email) {
        user = await this.userManagementService.getUserByEmail(query.email);
      }

      if (!user) {
        return QueryResult.failure<UserResult>('User not found');
      }

      const result: UserResult = {
        userId: user.getId().getValue(),
        email: user.getEmail().getValue(),
        fullName: user.getFullName(),
        isActive: user.getIsActive(),
        emailVerified: user.getEmailVerified(),
        createdAt: user.getCreatedAt(),
        updatedAt: user.getUpdatedAt(),
      };

      return QueryResult.success<UserResult>(result);
    } catch (error) {
      if (error instanceof Error) {
        return QueryResult.failure<UserResult>(
          'Failed to retrieve user: ' + error.message
        );
      }

      return QueryResult.failure<UserResult>(
        'An unexpected error occurred while retrieving user'
      );
    }
  }
}
