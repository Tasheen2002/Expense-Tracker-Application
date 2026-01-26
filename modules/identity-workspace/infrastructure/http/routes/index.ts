import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { registerAuthRoutes } from './auth.routes'
import { registerWorkspaceRoutes } from './workspace.routes'
import { AuthController } from '../controllers/auth.controller'
import { WorkspaceController } from '../controllers/workspace.controller'
import { UserManagementService } from '../../../application/services/user-management.service'
import { WorkspaceManagementService } from '../../../application/services/workspace-management.service'
import { WorkspaceMembershipService } from '../../../application/services/workspace-membership.service'
import { RegisterUserHandler } from '../../../application/commands/register-user.command'
import { LoginUserHandler } from '../../../application/queries/login-user.query'
import { CreateWorkspaceHandler } from '../../../application/commands/create-workspace.command'
import { UpdateWorkspaceHandler } from '../../../application/commands/update-workspace.command'
import { DeleteWorkspaceHandler } from '../../../application/commands/delete-workspace.command'
import {
  GetWorkspaceByIdHandler,
  GetUserWorkspacesHandler,
} from '../../../application/queries/get-workspace.query'
import { WorkspaceAuthHelper } from '../middleware/workspace-auth.helper'
import { UserRepositoryImpl } from '../../persistence/user.repository.impl'
import { WorkspaceRepositoryImpl } from '../../persistence/workspace.repository.impl'

export async function registerIdentityWorkspaceRoutes(
  fastify: FastifyInstance,
  services: {
    userManagementService: UserManagementService
    workspaceManagementService: WorkspaceManagementService
    workspaceMembershipService: WorkspaceMembershipService
    prisma: PrismaClient
  }
) {
  // Initialize repositories (can also come from DI container)
  const userRepository = new UserRepositoryImpl(services.prisma)
  const workspaceRepository = new WorkspaceRepositoryImpl(services.prisma)

  // Initialize command/query handlers - Auth
  const registerUserHandler = new RegisterUserHandler(services.userManagementService)
  const loginUserHandler = new LoginUserHandler(services.userManagementService)

  // Initialize command/query handlers - Workspace
  const createWorkspaceHandler = new CreateWorkspaceHandler(services.workspaceManagementService)
  const updateWorkspaceHandler = new UpdateWorkspaceHandler(services.workspaceManagementService)
  const deleteWorkspaceHandler = new DeleteWorkspaceHandler(services.workspaceManagementService)
  const getWorkspaceByIdHandler = new GetWorkspaceByIdHandler(
    services.workspaceManagementService
  )
  const getUserWorkspacesHandler = new GetUserWorkspacesHandler(
    services.workspaceManagementService
  )

  // Initialize auth helper
  const workspaceAuthHelper = new WorkspaceAuthHelper(services.workspaceMembershipService)

  // Initialize controllers
  const authController = new AuthController(registerUserHandler, loginUserHandler)
  const workspaceController = new WorkspaceController(
    createWorkspaceHandler,
    updateWorkspaceHandler,
    deleteWorkspaceHandler,
    getWorkspaceByIdHandler,
    getUserWorkspacesHandler,
    workspaceAuthHelper
  )

  // Register routes
  await registerAuthRoutes(fastify, authController)
  await registerWorkspaceRoutes(fastify, workspaceController)
}
