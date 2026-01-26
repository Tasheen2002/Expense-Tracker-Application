import 'fastify'
import { PrismaClient } from '@prisma/client'
import { JWTPayload } from '../plugins/auth.js'

/**
 * Fastify Type Augmentation
 * Extends Fastify types with our custom decorators and properties
 * Following e-commerce pattern for type definitions
 */
declare module 'fastify' {
  interface FastifyInstance {
    // Database decorator
    prisma: PrismaClient

    // Auth decorators
    signToken: (payload: JWTPayload) => string
    verifyToken: (token: string) => JWTPayload
    authenticate: (request: FastifyRequest) => Promise<void>
  }

  interface FastifyRequest {
    // User attached after authentication
    user?: JWTPayload
  }
}
