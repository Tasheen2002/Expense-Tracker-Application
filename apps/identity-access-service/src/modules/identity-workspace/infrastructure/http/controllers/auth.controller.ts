import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { RegisterUserHandler, LoginUserHandler, GetUserHandler } from '../../../application';
import { ResponseHelper } from '@shared/response.helper';
import { RegisterUserInput, LoginUserInput } from '../validation/user.schema';

export class AuthController {
  constructor(
    private readonly registerUserHandler: RegisterUserHandler,
    private readonly loginUserHandler: LoginUserHandler,
    private readonly getUserHandler: GetUserHandler
  ) {}

  async login(
    request: FastifyRequest<{ Body: LoginUserInput }>,
    reply: FastifyReply
  ) {
    try {
      const { email, password } = request.body;

      const userData = await this.loginUserHandler.handle({ email, password });

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
      const user = request.user;

      const result = await this.getUserHandler.handle({ userId: user.userId });

      return ResponseHelper.ok(reply, 'User profile retrieved', result);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async register(
    request: FastifyRequest<{ Body: RegisterUserInput }>,
    reply: FastifyReply
  ) {
    try {
      const { email, password, fullName } = request.body;

      const result = await this.registerUserHandler.handle({
        email,
        password,
        fullName,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'User registered successfully',
        result.data,
        201
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getUser(
    request: FastifyRequest<{ Params: { userId: string } }>,
    reply: FastifyReply
  ) {
    const { userId } = request.params;
    try {
      const result = await this.getUserHandler.handle({ userId });
      return ResponseHelper.ok(reply, 'User retrieved', result);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
