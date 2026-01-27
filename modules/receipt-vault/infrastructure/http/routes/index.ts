import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { receiptRoutes } from './receipt.routes'
import { tagRoutes } from './tag.routes'
import { ReceiptController } from '../controllers/receipt.controller'
import { TagController } from '../controllers/tag.controller'
import { workspaceAuthorizationMiddleware } from '../../../../../apps/api/src/shared/middleware'

interface ReceiptVaultServices {
  receiptController: ReceiptController
  tagController: TagController
  prisma: PrismaClient
}

export async function registerReceiptVaultRoutes(
  fastify: FastifyInstance,
  services: ReceiptVaultServices,
  prisma: PrismaClient
) {
  await fastify.register(
    async (instance) => {
      // Add workspace authorization middleware to all routes
      instance.addHook('onRequest', async (request, reply) => {
        await workspaceAuthorizationMiddleware(request as any, reply, prisma)
      })

      // Register receipt routes
      await receiptRoutes(instance, services.receiptController)

      // Register receipt tag routes
      await tagRoutes(instance, services.tagController)
    },
    { prefix: '/api/v1' }
  )
}
