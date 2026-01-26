import fp from 'fastify-plugin'
import { container } from './container'
import { registerIdentityWorkspaceRoutes } from '../../../modules/identity-workspace/infrastructure/http/routes/index'

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
    // Future modules will be registered here
    // ============================================
    // Example:
    // const expenseLedgerServices = container.getExpenseLedgerServices()
    // await registerExpenseLedgerRoutes(fastify, expenseLedgerServices)
    // fastify.log.info('✓ Expense-Ledger module registered')

    fastify.log.info('All modules registered successfully')
  },
  { name: 'module-loader' }
)
