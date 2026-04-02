import { FastifyInstance } from 'fastify';
import { AuthController } from '../controllers/auth.controller.js';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface.js';
import {
  createRateLimiter,
  RateLimitPresets,
} from '../../../../../apps/api/src/shared/middleware/rate-limiter.middleware.js';
import { validateBody } from '../validation/validator';
import { registerUserSchema, loginUserSchema } from '../validation/user.schema';

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
      preValidation: [validateBody(registerUserSchema)],
      schema: {
        description: 'Register a new user account',
        tags: ['Authentication'],
        summary: 'Register User',
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            fullName: { type: 'string' },
          },
        },
        response: {
          201: {
            description: 'User registered successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  userId: { type: 'string', format: 'uuid' },
                  email: { type: 'string' },
                  fullName: { type: 'string', nullable: true },
                  emailVerified: { type: 'boolean' },
                },
              },
              message: { type: 'string' },
            },
          },
          400: {
            description: 'Bad Request',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
          409: {
            description: 'User already exists',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
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
      preValidation: [validateBody(loginUserSchema)],
      schema: {
        description: 'Login with email and password',
        tags: ['Authentication'],
        summary: 'Login User',
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
        response: {
          200: {
            description: 'Login successful',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  user: {
                    type: 'object',
                    properties: {
                      userId: { type: 'string', format: 'uuid' },
                      email: { type: 'string' },
                      fullName: { type: 'string', nullable: true },
                      isActive: { type: 'boolean' },
                      emailVerified: { type: 'boolean' },
                    },
                  },
                  token: { type: 'string' },
                },
              },
              message: { type: 'string' },
            },
          },
          401: {
            description: 'Unauthorized',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
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
          200: {
            description: 'Current user information',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  userId: { type: 'string', format: 'uuid' },
                  email: { type: 'string' },
                  workspaceId: {
                    type: 'string',
                    format: 'uuid',
                    nullable: true,
                  },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    (request, reply) =>
      authController.me(request as AuthenticatedRequest, reply)
  );
}
