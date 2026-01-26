import { PrismaClient } from '@prisma/client'

// Identity-Workspace Module
import { UserRepositoryImpl } from '../../../modules/identity-workspace/infrastructure/persistence/user.repository.impl'
import { WorkspaceRepositoryImpl } from '../../../modules/identity-workspace/infrastructure/persistence/workspace.repository.impl'
import { WorkspaceMembershipRepositoryImpl } from '../../../modules/identity-workspace/infrastructure/persistence/workspace-membership.repository.impl'
import { UserManagementService } from '../../../modules/identity-workspace/application/services/user-management.service'
import { WorkspaceManagementService } from '../../../modules/identity-workspace/application/services/workspace-management.service'
import { WorkspaceMembershipService } from '../../../modules/identity-workspace/application/services/workspace-membership.service'

/**
 * Dependency Injection Container
 * Following e-commerce pattern for service registration
 */
export class Container {
  private static instance: Container
  private services: Map<string, any> = new Map()

  private constructor() {}

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container()
    }
    return Container.instance
  }

  /**
   * Register all services with dependencies
   */
  register(prisma: PrismaClient): void {
    // ============================================
    // Identity-Workspace Module
    // ============================================

    // Repositories
    const userRepository = new UserRepositoryImpl(prisma)
    const workspaceRepository = new WorkspaceRepositoryImpl(prisma)
    const workspaceMembershipRepository = new WorkspaceMembershipRepositoryImpl(prisma)

    this.services.set('userRepository', userRepository)
    this.services.set('workspaceRepository', workspaceRepository)
    this.services.set('workspaceMembershipRepository', workspaceMembershipRepository)

    // Services
    const userManagementService = new UserManagementService(userRepository)
    const workspaceManagementService = new WorkspaceManagementService(
      workspaceRepository,
      workspaceMembershipRepository
    )
    const workspaceMembershipService = new WorkspaceMembershipService(
      workspaceMembershipRepository
    )

    this.services.set('userManagementService', userManagementService)
    this.services.set('workspaceManagementService', workspaceManagementService)
    this.services.set('workspaceMembershipService', workspaceMembershipService)

    // Store Prisma for module route registration
    this.services.set('prisma', prisma)
  }

  /**
   * Get service by name
   */
  get<T>(serviceName: string): T {
    const service = this.services.get(serviceName)
    if (!service) {
      throw new Error(`Service ${serviceName} not found in container`)
    }
    return service as T
  }

  /**
   * Check if service exists
   */
  has(serviceName: string): boolean {
    return this.services.has(serviceName)
  }

  /**
   * Get all identity-workspace services for route registration
   */
  getIdentityWorkspaceServices() {
    return {
      userManagementService: this.get<UserManagementService>('userManagementService'),
      workspaceManagementService: this.get<WorkspaceManagementService>(
        'workspaceManagementService'
      ),
      workspaceMembershipService: this.get<WorkspaceMembershipService>(
        'workspaceMembershipService'
      ),
      prisma: this.get<PrismaClient>('prisma'),
    }
  }
}

export const container = Container.getInstance()
