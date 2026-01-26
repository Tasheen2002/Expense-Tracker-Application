import { PrismaClient } from '@prisma/client'

/**
 * Singleton Prisma Client
 * Prevents multiple instances in development (hot reload)
 * Following the e-commerce pattern for database client management
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

/**
 * Graceful shutdown
 * Ensures database connections are properly closed
 */
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

export type { PrismaClient }
