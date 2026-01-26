import { FastifyRequest, FastifyReply } from 'fastify'
import { RegisterUserHandler } from '../../../application/commands/register-user.command'
import { LoginUserHandler } from '../../../application/queries/login-user.query'

interface RegisterRequest {
  email: string
  password: string
  fullName?: string
}

interface LoginRequest {
  email: string
  password: string
}

export class AuthController {
  constructor(
    private readonly registerUserHandler: RegisterUserHandler,
    private readonly loginUserHandler: LoginUserHandler
  ) {}

  async register(
    request: FastifyRequest<{ Body: RegisterRequest }>,
    reply: FastifyReply
  ) {
    try {
      const { email, password, fullName } = request.body

      // Basic validation
      if (!email || typeof email !== 'string' || email.trim().length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'Bad Request',
          message: 'Email is required and must be a non-empty string',
        })
      }

      if (!password || typeof password !== 'string' || password.length < 8) {
        return reply.code(400).send({
          success: false,
          error: 'Bad Request',
          message: 'Password is required and must be at least 8 characters',
        })
      }

      // Execute command
      const result = await this.registerUserHandler.handle({
        email,
        password,
        fullName,
      })

      if (!result.success) {
        return reply.code(400).send({
          success: false,
          error: 'Bad Request',
          message: result.error,
          errors: result.errors,
        })
      }

      const user = result.data!

      return reply.code(201).send({
        success: true,
        data: {
          userId: user.getId().getValue(),
          email: user.getEmail().getValue(),
          fullName: user.getFullName(),
          emailVerified: user.getEmailVerified(),
        },
        message: 'User registered successfully',
      })
    } catch (error) {
      request.log.error(error, 'Failed to register user')

      if (error instanceof Error && error.message.includes('already exists')) {
        return reply.code(409).send({
          success: false,
          error: 'Conflict',
          message: 'User with this email already exists',
        })
      }

      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
        message: 'Failed to register user',
      })
    }
  }

  async login(request: FastifyRequest<{ Body: LoginRequest }>, reply: FastifyReply) {
    try {
      const { email, password } = request.body

      // Basic validation
      if (!email || typeof email !== 'string') {
        return reply.code(400).send({
          success: false,
          error: 'Bad Request',
          message: 'Email is required',
        })
      }

      if (!password || typeof password !== 'string') {
        return reply.code(400).send({
          success: false,
          error: 'Bad Request',
          message: 'Password is required',
        })
      }

      // Execute query
      const result = await this.loginUserHandler.handle({ email, password })

      if (!result.success) {
        return reply.code(401).send({
          success: false,
          error: 'Unauthorized',
          message: result.error || 'Invalid credentials',
        })
      }

      const userData = result.data!

      // Generate JWT token
      const token = request.server.signToken({
        userId: userData.userId,
        email: userData.email,
      })

      return reply.code(200).send({
        success: true,
        data: {
          user: userData,
          token,
        },
        message: 'Login successful',
      })
    } catch (error) {
      request.log.error(error, 'Failed to login user')

      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
        message: 'Failed to login',
      })
    }
  }

  async me(request: FastifyRequest, reply: FastifyReply) {
    try {
      // User is attached by authenticate middleware
      const user = (request as any).user

      if (!user) {
        return reply.code(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Not authenticated',
        })
      }

      return reply.code(200).send({
        success: true,
        data: {
          userId: user.userId,
          email: user.email,
          workspaceId: user.workspaceId,
        },
      })
    } catch (error) {
      request.log.error(error, 'Failed to get current user')

      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get user information',
      })
    }
  }
}
