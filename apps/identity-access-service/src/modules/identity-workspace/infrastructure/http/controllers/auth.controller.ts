import { FastifyRequest, FastifyReply } from 'fastify';
import {
  RegisterUserHandler,
  LoginUserHandler,
  GetUserHandler,
  UpdateProfileHandler,
} from '../../../application';
import { SessionService } from '../../../application/services/session.service';
import { ResponseHelper } from '@shared/response.helper';
import {
  RegisterUserInput,
  LoginUserInput,
  UpdateUserInput,
  UserParams,
} from '../validation/user.schema';
import { getAuthenticatedUser } from './controller.helper';

export class AuthController {
  constructor(
    private readonly registerUserHandler: RegisterUserHandler,
    private readonly loginUserHandler: LoginUserHandler,
    private readonly getUserHandler: GetUserHandler,
    private readonly updateProfileHandler: UpdateProfileHandler,
    private readonly sessionService: SessionService
  ) {}

  async login(
    request: FastifyRequest<{ Body: LoginUserInput }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const user = await this.loginUserHandler.handle(request.body);
    const session = await this.sessionService.createSession(user.userId);
    const token = await request.server.signToken({
      userId: user.userId,
      email: user.email,
      sessionId: session.sessionId,
    });
    return ResponseHelper.ok(reply, 'Login successful', { user, token });
  }

  async register(
    request: FastifyRequest<{ Body: RegisterUserInput }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const result = await this.registerUserHandler.handle(request.body);
    return ResponseHelper.fromCommand(
      reply,
      result,
      'User registered successfully',
      undefined,
      201
    );
  }

  async me(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const user = getAuthenticatedUser(request);
    const result = await this.getUserHandler.handle({
      actorId: user.userId,
      userId: user.userId,
    });
    return ResponseHelper.ok(reply, 'User profile retrieved', result);
  }

  async getUser(
    request: FastifyRequest<{ Params: UserParams }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const user = getAuthenticatedUser(request);
    const result = await this.getUserHandler.handle({
      actorId: user.userId,
      userId: request.params.userId,
    });
    return ResponseHelper.ok(reply, 'User retrieved', result);
  }

  async updateProfile(
    request: FastifyRequest<{ Params: UserParams; Body: UpdateUserInput }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const user = getAuthenticatedUser(request);
    const result = await this.updateProfileHandler.handle({
      ...request.body,
      userId: request.params.userId,
      actorId: user.userId,
    });
    return ResponseHelper.fromCommand(reply, result, 'Profile updated successfully');
  }

  async logout(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const user = getAuthenticatedUser(request);
    if (user.sessionId) {
      await this.sessionService.revokeSession(user.sessionId);
    }
    return reply.status(204).send();
  }
}
