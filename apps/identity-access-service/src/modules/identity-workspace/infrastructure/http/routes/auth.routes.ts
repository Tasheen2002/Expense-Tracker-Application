import { FastifyInstance } from 'fastify';
import { AuthController } from '../controllers/auth.controller';
import { validateBody } from '../validation/validator';
import {
  registerUserSchema,
  loginUserSchema,
  profileUpdateSchema,
  userParamsJsonSchema,
  registerUserBodyJsonSchema,
  loginUserBodyJsonSchema,
  profileUpdateBodyJsonSchema,
  registerSuccessResponseJsonSchema,
  loginSuccessResponseJsonSchema,
  userEnvelopeJsonSchema,
  RegisterUserInput,
  LoginUserInput,
  UpdateUserInput,
  UserParams,
} from '../validation/user.schema';

export async function registerAuthRoutes(
  app: FastifyInstance,
  controller: AuthController
): Promise<void> {
  const authRateLimit = { rateLimit: { max: 10, timeWindow: '15 minutes' } };
  const writeRateLimit = { rateLimit: { max: 30, timeWindow: '1 minute' } };

  // 1. Register User (Public)
  app.post<{ Body: RegisterUserInput }>(
    '/auth/register',
    {
      config: authRateLimit,
      preHandler: [validateBody(registerUserSchema)],
      schema: {
        body: registerUserBodyJsonSchema,
        response: {
          201: registerSuccessResponseJsonSchema,
        },
      },
    },
    (request, reply) => controller.register(request, reply)
  );

  // 2. Login User (Public)
  app.post<{ Body: LoginUserInput }>(
    '/auth/login',
    {
      config: authRateLimit,
      preHandler: [validateBody(loginUserSchema)],
      schema: {
        body: loginUserBodyJsonSchema,
        response: {
          200: loginSuccessResponseJsonSchema,
        },
      },
    },
    (request, reply) => controller.login(request, reply)
  );

  // 3. Get Current User Profile (Authenticated)
  app.get(
    '/auth/me',
    {
      onRequest: [app.authenticate],
      schema: {
        response: {
          200: userEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) => controller.me(request, reply)
  );

  // 4. Logout User (Authenticated)
  app.post(
    '/auth/logout',
    {
      onRequest: [app.authenticate],
      schema: {
        response: {
          204: {
            type: 'null',
            description: 'Session invalidated successfully',
          },
        },
      },
    },
    (request, reply) => controller.logout(request, reply)
  );

  // 5. Get User by ID (Authenticated)
  app.get<{ Params: UserParams }>(
    '/users/:userId',
    {
      onRequest: [app.authenticate],
      schema: {
        params: userParamsJsonSchema,
        response: {
          200: userEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) => controller.getUser(request, reply)
  );

  // 6. Update User Profile (Authenticated)
  app.patch<{ Params: UserParams; Body: UpdateUserInput }>(
    '/users/:userId',
    {
      onRequest: [app.authenticate],
      config: writeRateLimit,
      preHandler: [validateBody(profileUpdateSchema)],
      schema: {
        params: userParamsJsonSchema,
        body: profileUpdateBodyJsonSchema,
        response: {
          200: userEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) => controller.updateProfile(request, reply)
  );
}
