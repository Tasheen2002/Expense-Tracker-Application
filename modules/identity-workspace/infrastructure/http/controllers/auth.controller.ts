import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import { RegisterUserHandler } from '../../../application/commands/register-user.command';
import { LoginUserHandler } from '../../../application/queries/login-user.query';
import { GetUserHandler } from '../../../application/queries/get-user.query';
import { ResponseHelper } from '../../../../../apps/api/src/shared/response.helper';

interface RegisterRequest {
  email: string;
  password: string;
  fullName?: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

export class AuthController {
  constructor(
    private readonly registerUserHandler: RegisterUserHandler,
    private readonly loginUserHandler: LoginUserHandler,
    private readonly getUserHandler: GetUserHandler
  ) {}

  async register(
    request: FastifyRequest<{ Body: RegisterRequest }>,
    reply: FastifyReply
  ) {
    try {
      const { email, password, fullName } = request.body;

      // Execute command
      const result = await this.registerUserHandler.handle({
        email,
        password,
        fullName,
      });

      if (!result.success) {
        return ResponseHelper.badRequest(
          reply,
          result.error || 'Registration failed'
        );
      }

      const user = result.data!;

      return ResponseHelper.created(
        reply,
        'User registered successfully',
        user.toJSON()
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async login(
    request: FastifyRequest<{ Body: LoginRequest }>,
    reply: FastifyReply
  ) {
    try {
      const { email, password } = request.body;

      // Execute query
      const result = await this.loginUserHandler.handle({ email, password });

      if (!result.success) {
        return ResponseHelper.unauthorized(
          reply,
          result.error || 'Invalid credentials'
        );
      }

      const userData = result.data!;

      // Generate JWT token
      const token = request.server.signToken({
        userId: userData.userId,
        email: userData.email,
      });

      return ResponseHelper.ok(reply, 'Login successful', {
        user: userData,
        token,
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async me(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      // User is attached by authenticate middleware
      const user = request.user;

      const result = await this.getUserHandler.handle({ userId: user.userId });

      if (!result.success || !result.data) {
        return ResponseHelper.notFound(reply, 'User not found');
      }

      return ResponseHelper.ok(reply, 'User profile retrieved', result.data);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
