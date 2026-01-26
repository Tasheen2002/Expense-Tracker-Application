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

  // Register Core Plugins
  await server.register(configPlugin)

  // Register Security Plugins (CORS, Helmet, Rate Limit)
  await server.register(securityPlugin)

  // Register Database Plugin
  await server.register(dbPlugin)

  // Register Authentication Plugin
  await server.register(authPlugin)

  // Register Error Handler Plugin
  await server.register(errorPlugin)

  // Register Swagger (Documentation)
  await server.register(swaggerPlugin)

  // Initialize Dependency Injection Container
  const prisma = server.prisma
  container.register(prisma)
  server.log.info('✓ DI Container initialized')

  // Register Domain Modules
  await server.register(moduleLoader)

  // Health Check
  server.get('/health', async () => {
    return { status: 'ok', uptime: process.uptime() }
  })

  return server
}
