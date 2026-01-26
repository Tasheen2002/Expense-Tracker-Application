import { UserManagementService } from '../services/user-management.service'
import { CommandResult } from '../commands/register-user.command'

// Query interfaces
export interface IQuery {
  readonly queryId?: string
  readonly timestamp?: Date
}

export interface IQueryHandler<TQuery extends IQuery, TResult = any> {
  handle(query: TQuery): Promise<TResult>
}

// Login User Query
export interface LoginUserQuery extends IQuery {
  email: string
  password: string
}

export interface LoginUserResult {
  userId: string
  email: string
  fullName: string | null
  isActive: boolean
  emailVerified: boolean
}

export class LoginUserHandler
  implements IQueryHandler<LoginUserQuery, CommandResult<LoginUserResult>>
{
  constructor(private readonly userManagementService: UserManagementService) {}

  async handle(query: LoginUserQuery): Promise<CommandResult<LoginUserResult>> {
    try {
      // Validate email
      if (!query.email || typeof query.email !== 'string') {
        return CommandResult.failure<LoginUserResult>('Email is required', ['email'])
      }

      // Validate password
      if (!query.password || typeof query.password !== 'string') {
        return CommandResult.failure<LoginUserResult>('Password is required', ['password'])
      }

      // Verify credentials
      const user = await this.userManagementService.verifyPassword(query.email, query.password)

      if (!user) {
        return CommandResult.failure<LoginUserResult>('Invalid email or password')
      }

      // Check if user is active
      if (!user.getIsActive()) {
        return CommandResult.failure<LoginUserResult>('Account is deactivated')
      }

      const result: LoginUserResult = {
        userId: user.getId().getValue(),
        email: user.getEmail().getValue(),
        fullName: user.getFullName(),
        isActive: user.getIsActive(),
        emailVerified: user.getEmailVerified(),
      }

      return CommandResult.success<LoginUserResult>(result)
    } catch (error) {
      if (error instanceof Error) {
        return CommandResult.failure<LoginUserResult>('Login failed', [error.message])
      }

      return CommandResult.failure<LoginUserResult>(
        'An unexpected error occurred during login'
      )
    }
  }
}
