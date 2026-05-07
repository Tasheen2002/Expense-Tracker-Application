import Fastify, { FastifyInstance } from 'fastify'
import configPlugin from './plugins/config.js'
import swaggerPlugin from './plugins/swagger.js'
import dbPlugin from './plugins/db.js'
import authPlugin from './plugins/auth.js'
import errorPlugin from './plugins/error.js'
import securityPlugin from './plugins/security.js'
import moduleLoader from './modules.js'
import { container } from './container'

export const createServer = async (): Promise<FastifyInstance> => {
  const server = Fastify({
    // Allow OpenAPI's `example` keyword in JSON Schemas — Fastify's default
    // Ajv config rejects unknown keywords, which silently drops the
    // examples Swagger UI uses to render "Try it out" defaults.
    ajv: {
      customOptions: {
        keywords: ['example'],
      },
    },
    logger:
      process.env.NODE_ENV === 'development'
        ? {
            level: process.env.LOG_LEVEL || 'info',
            transport: {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
                colorize: true,
              },
            },
          }
        : {
            level: process.env.LOG_LEVEL || 'info',
          },
    schemaErrorFormatter: (errors, dataVar) => {
      const error = errors[0]
      let message = `${dataVar}${error.instancePath} ${error.message}`
      if (error.params && 'missingProperty' in error.params) {
        message = `${dataVar} must have required property '${error.params.missingProperty}'`
      }
      return new Error(message)
    },
  })

  // Core plugins — order matters (config before anything that reads it,
  // db/auth before container registration, error before swagger).
  await server.register(configPlugin)
  await server.register(securityPlugin)
  await server.register(dbPlugin)
  await server.register(authPlugin)
  await server.register(errorPlugin)
  await server.register(swaggerPlugin)

  // Initialize DI container with prisma + env-derived config so services
  // never reach into `process.env` themselves.
  container.register(server.prisma, {
    jwtSecret: server.config.JWT_SECRET,
    jwtExpiresIn: server.config.JWT_EXPIRES_IN,
  })
  server.log.info('✓ DI Container initialized')

  // Register Domain Modules
  await server.register(moduleLoader)

  // Health Check
  server.get('/health', async () => {
    return { status: 'ok', uptime: process.uptime() }
  })

  return server
}
