import { FastifyInstance } from 'fastify';
import { AuthController } from '../controllers/auth.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import {
  createRateLimiter,
  RateLimitPresets,
} from '@shared/middleware/rate-limiter.middleware';
import { validateBody } from '../validation/validator';
import { registerUserSchema, loginUserSchema } from '../validation/user.schema';
import {
  registerUserBodyJsonSchema,
  loginUserBodyJsonSchema,
  registerSuccessResponseJsonSchema,
  loginSuccessResponseJsonSchema,
  meSuccessResponseJsonSchema,
} from '../validation/user.schema';

const authRateLimiter = createRateLimiter(RateLimitPresets.auth);

export async function registerAuthRoutes(
  fastify: FastifyInstance,
  authController: AuthController
) {
  // Register user
  fastify.post(
    '/auth/register',
    {
      onRequest: [authRateLimiter],
      preHandler: [validateBody(registerUserSchema)],
      schema: {
        description: 'Register a new user account',
        tags: ['Authentication'],
        summary: 'Register User',
        body: registerUserBodyJsonSchema,
        response: {
          201: registerSuccessResponseJsonSchema,
        },
      },
    },
    async (request, reply) => authController.register(request as any, reply)
  );

  // Login user
  fastify.post(
    '/auth/login',
    {
      onRequest: [authRateLimiter],
      preHandler: [validateBody(loginUserSchema)],
      schema: {
        description: 'Login with email and password',
        tags: ['Authentication'],
        summary: 'Login User',
        body: loginUserBodyJsonSchema,
        response: {
          200: loginSuccessResponseJsonSchema,
        },
      },
    },
    async (request, reply) => authController.login(request as any, reply)
  );

  // Get current user (protected route)
  fastify.get(
    '/auth/me',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get current authenticated user',
        tags: ['Authentication'],
        summary: 'Get Current User',
        security: [{ bearerAuth: [] }],
        response: {
          200: meSuccessResponseJsonSchema,
        },
      },
    },
    (request, reply) =>
      authController.me(request as AuthenticatedRequest, reply)
  );
}
