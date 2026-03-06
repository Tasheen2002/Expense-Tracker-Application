import fp from "fastify-plugin";
import { FastifyPluginAsync, FastifyRequest } from "fastify";
import jwt, { SignOptions } from "jsonwebtoken";

/**
 * JWT Payload interface
 */
export interface JWTPayload {
  userId: string;
  email: string;
  workspaceId?: string;
}

/**
 * Authentication Plugin
 * Provides JWT token verification and authentication decorators
 * Following e-commerce pattern for auth plugin
 */
const authPlugin: FastifyPluginAsync = async (fastify) => {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is required");
  }

  /**
   * Decorator: Sign JWT token
   */
  fastify.decorate("signToken", (payload: JWTPayload): string => {
    const expiresIn = (process.env.JWT_EXPIRES_IN || "7d") as string;
    return jwt.sign(payload, JWT_SECRET, { expiresIn } as SignOptions);
  });

  /**
   * Decorator: Verify JWT token
   */
  fastify.decorate("verifyToken", (token: string): JWTPayload => {
    try {
      return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch (error) {
      const err = new Error("Invalid or expired token") as Error & {
        statusCode: number;
      };
      err.statusCode = 401;
      throw err;
    }
  });

  /**
   * Decorator: Authenticate request
   * Verifies JWT from Authorization header
   */
  fastify.decorate("authenticate", async (request: FastifyRequest) => {
    try {
      const authHeader = request.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        const err = new Error(
          "Missing or invalid authorization header",
        ) as Error & { statusCode: number };
        err.statusCode = 401;
        throw err;
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;

      // Attach user info to request
      (request as FastifyRequest & { user: JWTPayload }).user = payload;
    } catch (error) {
      const err = new Error(
        error instanceof Error ? error.message : "Authentication failed",
      ) as Error & { statusCode: number };
      err.statusCode = 401;
      throw err;
    }
  });

  fastify.log.info("Authentication plugin registered");
};

export default fp(authPlugin, {
  name: "auth-plugin",
});
