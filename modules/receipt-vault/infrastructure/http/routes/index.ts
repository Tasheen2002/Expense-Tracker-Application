import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { receiptRoutes } from './receipt.routes'
import { tagRoutes } from './tag.routes'
import { ReceiptController } from '../controllers/receipt.controller'
import { TagController } from '../controllers/tag.controller'

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
  // Register receipt routes
  await receiptRoutes(fastify, services.receiptController)

  // Register receipt tag routes
  await tagRoutes(fastify, services.tagController)
}
