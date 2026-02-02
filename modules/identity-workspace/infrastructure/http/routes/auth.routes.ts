import { FastifyInstance } from "fastify";
import { AuthController } from "../controllers/auth.controller";

export async function registerAuthRoutes(
  fastify: FastifyInstance,
  authController: AuthController,
) {
  // Register user
  fastify.post(
    "/auth/register",
    {
      schema: {
        description: "Register a new user account",
        tags: ["Authentication"],
        summary: "Register User",
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 8 },
            fullName: { type: "string" },
          },
        },
        response: {
          201: {
            description: "User registered successfully",
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              data: {
                type: "object",
                properties: {
                  userId: { type: "string", format: "uuid" },
                  email: { type: "string" },
                  fullName: { type: "string", nullable: true },
                  emailVerified: { type: "boolean" },
                },
              },
              message: { type: "string" },
            },
          },
          400: {
            description: "Bad Request",
            type: "object",
            properties: {
              success: { type: "boolean", example: false },
              error: { type: "string" },
              message: { type: "string" },
            },
          },
          409: {
            description: "User already exists",
            type: "object",
            properties: {
              success: { type: "boolean", example: false },
              error: { type: "string" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    authController.register.bind(authController),
  );

  // Login user
  fastify.post(
    "/auth/login",
    {
      schema: {
        description: "Login with email and password",
        tags: ["Authentication"],
        summary: "Login User",
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string" },
          },
        },
        response: {
          200: {
            description: "Login successful",
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              data: {
                type: "object",
                properties: {
                  user: {
                    type: "object",
                    properties: {
                      userId: { type: "string", format: "uuid" },
                      email: { type: "string" },
                      fullName: { type: "string", nullable: true },
                      isActive: { type: "boolean" },
                      emailVerified: { type: "boolean" },
                    },
                  },
                  token: { type: "string" },
                },
              },
              message: { type: "string" },
            },
          },
          401: {
            description: "Unauthorized",
            type: "object",
            properties: {
              success: { type: "boolean", example: false },
              error: { type: "string" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    authController.login.bind(authController),
  );

  // Get current user (protected route)
  fastify.get(
    "/auth/me",
    {
      preHandler: async (request, reply) => {
        await request.server.authenticate(request);
      },
      schema: {
        description: "Get current authenticated user",
        tags: ["Authentication"],
        summary: "Get Current User",
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: "Current user information",
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              data: {
                type: "object",
                properties: {
                  userId: { type: "string", format: "uuid" },
                  email: { type: "string" },
                  workspaceId: {
                    type: "string",
                    format: "uuid",
                    nullable: true,
                  },
                },
              },
            },
          },
          401: {
            description: "Unauthorized",
            type: "object",
            properties: {
              success: { type: "boolean", example: false },
              error: { type: "string" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    (request, reply) => authController.me(request as any, reply),
  );
}
