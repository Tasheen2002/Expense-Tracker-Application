import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { registerAuthRoutes } from './auth.routes'
import { registerWorkspaceRoutes } from './workspace.routes'
import { registerInvitationRoutes } from './invitation.routes'
import { registerMemberRoutes } from './member.routes'
import { AuthController } from '../controllers/auth.controller'
import { WorkspaceController } from '../controllers/workspace.controller'
import { InvitationController } from '../controllers/invitation.controller'
import { MemberController } from '../controllers/member.controller'
import { UserManagementService } from '../../../application/services/user-management.service'
import { WorkspaceManagementService } from '../../../application/services/workspace-management.service'
import { WorkspaceMembershipService } from '../../../application/services/workspace-membership.service'
import { WorkspaceInvitationService } from '../../../application/services/workspace-invitation.service'
import { RegisterUserHandler } from '../../../application/commands/register-user.command'
import { LoginUserHandler } from '../../../application/queries/login-user.query'
import { CreateWorkspaceHandler } from '../../../application/commands/create-workspace.command'
import { UpdateWorkspaceHandler } from '../../../application/commands/update-workspace.command'
import { DeleteWorkspaceHandler } from '../../../application/commands/delete-workspace.command'
import {
  GetWorkspaceByIdHandler,
  GetUserWorkspacesHandler,
} from '../../../application/queries/get-workspace.query'
import { CreateInvitationHandler } from '../../../application/commands/create-invitation.command'
import { AcceptInvitationHandler } from '../../../application/commands/accept-invitation.command'
import { CancelInvitationHandler } from '../../../application/commands/cancel-invitation.command'
import {
  GetInvitationByTokenHandler,
  GetWorkspaceInvitationsHandler,
  GetPendingInvitationsHandler,
} from '../../../application/queries/get-invitation.query'
import { WorkspaceAuthHelper } from '../middleware/workspace-auth.helper'
import { UserRepositoryImpl } from '../../persistence/user.repository.impl'
import { WorkspaceRepositoryImpl } from '../../persistence/workspace.repository.impl'

export async function registerIdentityWorkspaceRoutes(
  fastify: FastifyInstance,
  services: {
    userManagementService: UserManagementService
    workspaceManagementService: WorkspaceManagementService
    workspaceMembershipService: WorkspaceMembershipService
    workspaceInvitationService: WorkspaceInvitationService
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

  // Initialize command/query handlers - Invitation
  const createInvitationHandler = new CreateInvitationHandler(services.workspaceInvitationService)
  const acceptInvitationHandler = new AcceptInvitationHandler(services.workspaceInvitationService)
  const cancelInvitationHandler = new CancelInvitationHandler(services.workspaceInvitationService)
  const getInvitationByTokenHandler = new GetInvitationByTokenHandler(
    services.workspaceInvitationService
  )
  const getWorkspaceInvitationsHandler = new GetWorkspaceInvitationsHandler(
    services.workspaceInvitationService
  )
  const getPendingInvitationsHandler = new GetPendingInvitationsHandler(
    services.workspaceInvitationService
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
  const invitationController = new InvitationController(
    createInvitationHandler,
    acceptInvitationHandler,
    cancelInvitationHandler,
    getInvitationByTokenHandler,
    getWorkspaceInvitationsHandler,
    getPendingInvitationsHandler,
    workspaceAuthHelper
  )
  const memberController = new MemberController(
    services.workspaceMembershipService,
    workspaceAuthHelper
  )

  // Register routes
  await registerAuthRoutes(fastify, authController)
  await registerWorkspaceRoutes(fastify, workspaceController)
  await registerInvitationRoutes(fastify, invitationController)
  await registerMemberRoutes(fastify, memberController)
}
