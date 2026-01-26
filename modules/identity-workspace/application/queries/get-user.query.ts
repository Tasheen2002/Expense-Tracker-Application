import { UserManagementService } from '../services/user-management.service'
import { CommandResult } from '../commands/register-user.command'
import { IQuery, IQueryHandler } from './login-user.query'

export interface GetUserQuery extends IQuery {
  userId?: string
  email?: string
}

export interface UserResult {
  userId: string
  email: string
  fullName: string | null
  isActive: boolean
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}

export class GetUserHandler implements IQueryHandler<GetUserQuery, CommandResult<UserResult>> {
  constructor(private readonly userManagementService: UserManagementService) {}

  async handle(query: GetUserQuery): Promise<CommandResult<UserResult>> {
    try {
      // Validate that either userId or email is provided
      if (!query.userId && !query.email) {
        return CommandResult.failure<UserResult>('Either userId or email is required', [
          'userId',
          'email',
        ])
      }

      // Get user by ID or email
      let user
      if (query.userId) {
        user = await this.userManagementService.getUserById(query.userId)
      } else if (query.email) {
        user = await this.userManagementService.getUserByEmail(query.email)
      }

      if (!user) {
        return CommandResult.failure<UserResult>('User not found')
      }

      const result: UserResult = {
        userId: user.getId().getValue(),
        email: user.getEmail().getValue(),
        fullName: user.getFullName(),
        isActive: user.getIsActive(),
        emailVerified: user.getEmailVerified(),
        createdAt: user.getCreatedAt(),
        updatedAt: user.getUpdatedAt(),
      }

      return CommandResult.success<UserResult>(result)
    } catch (error) {
      if (error instanceof Error) {
        return CommandResult.failure<UserResult>('Failed to retrieve user', [error.message])
      }

      return CommandResult.failure<UserResult>(
        'An unexpected error occurred while retrieving user'
      )
    }
  }
}
