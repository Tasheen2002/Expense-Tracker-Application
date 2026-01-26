import fp from 'fastify-plugin'
import { container } from './container'
import { registerIdentityWorkspaceRoutes } from '../../../modules/identity-workspace/infrastructure/http/routes/index'
import { registerExpenseLedgerRoutes } from '../../../modules/expense-ledger/infrastructure/http/routes/index'

export default fp(
  async (fastify) => {
    fastify.log.info('Registering modules...')

    // ============================================
    // Identity-Workspace Module
    // ============================================
    const identityWorkspaceServices = container.getIdentityWorkspaceServices()
    await registerIdentityWorkspaceRoutes(fastify, identityWorkspaceServices)
    fastify.log.info('✓ Identity-Workspace module registered')

    // ============================================
    // Expense-Ledger Module
    // ============================================
    const expenseLedgerServices = container.getExpenseLedgerServices()
    await registerExpenseLedgerRoutes(fastify, expenseLedgerServices, expenseLedgerServices.prisma)
    fastify.log.info('✓ Expense-Ledger module registered')

    fastify.log.info('All modules registered successfully')
  },
  { name: 'module-loader' }
)
