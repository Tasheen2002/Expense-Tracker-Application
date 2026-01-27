import { FastifyRequest, FastifyReply } from 'fastify'
import { RegisterUserHandler } from '../../../application/commands/register-user.command'
import { LoginUserHandler } from '../../../application/queries/login-user.query'
import { ResponseHelper } from "../../../../../apps/api/src/shared/response.helper";

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
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error)
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
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error)
    }
  }

  async me(request: FastifyRequest, reply: FastifyReply) {
    try {
      // User is attached by authenticate middleware
      const user = request.user

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
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error)
    }
  }
}
