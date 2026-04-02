import Fastify, { FastifyInstance } from 'fastify'
import configPlugin from './plugins/config'
import dbPlugin from './plugins/db'
import authPlugin from './plugins/auth'
import errorPlugin from './plugins/error'
import securityPlugin from './plugins/security'
import { MinimalContainer } from './minimal-container'
import { testModuleLoader } from './test-modules'

export const createTestServer = async (): Promise<FastifyInstance> => {
  const server = Fastify({
    logger: false, // Disable logger for cleaner test output
  })

  // Register Core Plugins
  await server.register(configPlugin)
  await server.register(securityPlugin)
  await server.register(dbPlugin)
  await server.register(authPlugin)
  await server.register(errorPlugin)

  // Initialize Minimal Container
  const prisma = server.prisma
  const container = new MinimalContainer(prisma)

  // Register Test Modules
  await server.register(testModuleLoader(container))

  return server
}
