import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'

/**
 * Security Plugin
 * Configures CORS, helmet, rate limiting, and other security measures
 * Following e-commerce pattern for security configuration
 */
const securityPlugin: FastifyPluginAsync = async (fastify) => {
  /**
   * CORS Configuration
   * Allow frontend origins to access the API
   */
  await fastify.register(cors, {
    origin: process.env.FRONTEND_URL?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })

  /**
   * Helmet - Security headers
   * Protects against common web vulnerabilities
   */
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false, // For Swagger UI
  })

  /**
   * Rate Limiting
   * Prevents abuse and DoS attacks
   */
  await fastify.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    timeWindow: process.env.RATE_LIMIT_TIMEWINDOW || '15m',
    errorResponseBuilder: (request, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded, please try again later',
      retryAfter: context.after,
    }),
  })

  fastify.log.info('Security plugins registered (CORS, Helmet, Rate Limit)')
}

export default fp(securityPlugin, {
  name: 'security-plugin',
})
