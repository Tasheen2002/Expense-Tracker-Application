import { PrismaClient } from '@prisma/client';
import { BcryptPasswordHasher } from '@shared/infrastructure/bcrypt-password-hasher';
import { IdentityPersistenceContext } from '@shared/infrastructure/persistence/identity-persistence.context';

import {
  UserRepositoryImpl,
  WorkspaceRepositoryImpl,
  WorkspaceMembershipRepositoryImpl,
  WorkspaceInvitationRepositoryImpl,
  SessionRepositoryImpl,
} from './modules/identity-workspace/infrastructure/persistence';

import { UserManagementService } from './modules/identity-workspace/application/services/user-management.service';
import { WorkspaceManagementService } from './modules/identity-workspace/application/services/workspace-management.service';
import { WorkspaceMembershipService } from './modules/identity-workspace/application/services/workspace-membership.service';
import { WorkspaceInvitationService } from './modules/identity-workspace/application/services/workspace-invitation.service';
import { OperationService } from './modules/identity-workspace/application/services/operation.service';
import { SessionService, ISessionService } from './modules/identity-workspace/application/services/session.service';

import { RegisterUserHandler } from './modules/identity-workspace/application/commands/register-user.command';
import { UpdateProfileHandler } from './modules/identity-workspace/application/commands/update-profile.command';
import { LoginUserHandler } from './modules/identity-workspace/application/queries/login-user.query';
import { GetUserHandler } from './modules/identity-workspace/application/queries/get-user.query';

import { CreateWorkspaceHandler } from './modules/identity-workspace/application/commands/create-workspace.command';
import { UpdateWorkspaceHandler } from './modules/identity-workspace/application/commands/update-workspace.command';
import { DeleteWorkspaceHandler } from './modules/identity-workspace/application/commands/delete-workspace.command';
import { TransferOwnershipHandler } from './modules/identity-workspace/application/commands/transfer-ownership.command';
import { GetWorkspaceByIdHandler } from './modules/identity-workspace/application/queries/get-workspace-by-id.query';
import { GetUserWorkspacesHandler } from './modules/identity-workspace/application/queries/get-user-workspaces.query';

import { CreateInvitationHandler } from './modules/identity-workspace/application/commands/create-invitation.command';
import { AcceptInvitationHandler } from './modules/identity-workspace/application/commands/accept-invitation.command';
import { CancelInvitationHandler } from './modules/identity-workspace/application/commands/cancel-invitation.command';
import { GetInvitationByTokenHandler } from './modules/identity-workspace/application/queries/get-invitation-by-token.query';
import { GetPendingInvitationsHandler } from './modules/identity-workspace/application/queries/get-pending-invitations.query';

import { ListWorkspaceMembersHandler } from './modules/identity-workspace/application/queries/list-workspace-members.query';
import { GetMemberHandler } from './modules/identity-workspace/application/queries/get-member.query';
import { RemoveMemberHandler } from './modules/identity-workspace/application/commands/remove-member.command';
import { ChangeMemberRoleHandler } from './modules/identity-workspace/application/commands/change-member-role.command';

import { AuthController } from './modules/identity-workspace/infrastructure/http/controllers/auth.controller';
import { WorkspaceController } from './modules/identity-workspace/infrastructure/http/controllers/workspace.controller';
import { InvitationController } from './modules/identity-workspace/infrastructure/http/controllers/invitation.controller';
import { MemberController } from './modules/identity-workspace/infrastructure/http/controllers/member.controller';
import { IdentityWorkspaceModuleControllers } from './modules/identity-workspace/infrastructure/http/routes';

export interface CompositionRoot {
  readonly sessionService: ISessionService;
  readonly controllers: IdentityWorkspaceModuleControllers;
}

/**
 * Pure Composition Root factory.
 * Constructs the entire service dependency graph bottom-up with:
 * - Zero mutable maps
 * - Zero string-based lookups
 * - Compile-time type safety
 * - Frozen public structure
 * - Strict lifecycle alignment with the supplied PrismaClient
 */
export function createCompositionRoot(prisma: PrismaClient): CompositionRoot {
  if (!prisma) {
    throw new Error('[CompositionRoot] FATAL: A valid PrismaClient instance must be provided.');
  }

  // 1. Infrastructure services
  const rounds = Number(process.env.BCRYPT_ROUNDS || 10);
  const passwordHasher = new BcryptPasswordHasher(
    Number.isInteger(rounds) && rounds >= 4 && rounds <= 15 ? rounds : 10
  );
  const persistenceContext = new IdentityPersistenceContext(prisma);

  // 2. Repositories
  const userRepository = new UserRepositoryImpl(persistenceContext);
  const workspaceRepository = new WorkspaceRepositoryImpl(persistenceContext);
  const workspaceMembershipRepository = new WorkspaceMembershipRepositoryImpl(persistenceContext);
  const workspaceInvitationRepository = new WorkspaceInvitationRepositoryImpl(persistenceContext);
  const sessionRepository = new SessionRepositoryImpl(persistenceContext);

  // 3. Operational cross-cutting unit of work
  const operationService = new OperationService(
    persistenceContext,
    userRepository,
    workspaceRepository,
    workspaceMembershipRepository
  );

  // 4. Domain / Application Services
  const userManagementService = new UserManagementService(userRepository, passwordHasher);
  const workspaceManagementService = new WorkspaceManagementService(
    workspaceRepository,
    workspaceMembershipRepository
  );
  const workspaceMembershipService = new WorkspaceMembershipService(
    workspaceMembershipRepository
  );
  const workspaceInvitationService = new WorkspaceInvitationService(
    workspaceInvitationRepository,
    workspaceMembershipRepository,
    userRepository,
    workspaceRepository
  );
  const sessionService = new SessionService(sessionRepository);

  // 5. Command Handlers
  const registerUserHandler = new RegisterUserHandler(userManagementService, operationService, passwordHasher);
  const updateProfileHandler = new UpdateProfileHandler(userManagementService, operationService);
  const createWorkspaceHandler = new CreateWorkspaceHandler(workspaceManagementService, operationService);
  const updateWorkspaceHandler = new UpdateWorkspaceHandler(workspaceManagementService, operationService);
  const deleteWorkspaceHandler = new DeleteWorkspaceHandler(workspaceManagementService, operationService);
  const transferOwnershipHandler = new TransferOwnershipHandler(workspaceManagementService, operationService);
  const createInvitationHandler = new CreateInvitationHandler(workspaceInvitationService, operationService);
  const acceptInvitationHandler = new AcceptInvitationHandler(workspaceInvitationService, operationService);
  const cancelInvitationHandler = new CancelInvitationHandler(workspaceInvitationService, operationService);
  const removeMemberHandler = new RemoveMemberHandler(workspaceMembershipService, operationService);
  const changeMemberRoleHandler = new ChangeMemberRoleHandler(workspaceMembershipService, operationService);

  // 6. Query Handlers
  const loginUserHandler = new LoginUserHandler(userManagementService);
  const getUserHandler = new GetUserHandler(userManagementService, operationService);
  const getWorkspaceByIdHandler = new GetWorkspaceByIdHandler(workspaceManagementService, operationService);
  const getUserWorkspacesHandler = new GetUserWorkspacesHandler(workspaceManagementService, operationService);
  const getInvitationByTokenHandler = new GetInvitationByTokenHandler(workspaceInvitationService);
  const getPendingInvitationsHandler = new GetPendingInvitationsHandler(workspaceInvitationService, operationService);
  const listWorkspaceMembersHandler = new ListWorkspaceMembersHandler(workspaceMembershipService, operationService);
  const getMemberHandler = new GetMemberHandler(workspaceMembershipService, operationService);

  // 7. HTTP Controllers
  const authController = new AuthController(
    registerUserHandler,
    loginUserHandler,
    getUserHandler,
    updateProfileHandler,
    sessionService
  );
  const workspaceController = new WorkspaceController(
    createWorkspaceHandler,
    updateWorkspaceHandler,
    deleteWorkspaceHandler,
    getWorkspaceByIdHandler,
    getUserWorkspacesHandler,
    transferOwnershipHandler
  );
  const invitationController = new InvitationController(
    createInvitationHandler,
    acceptInvitationHandler,
    cancelInvitationHandler,
    getInvitationByTokenHandler,
    getPendingInvitationsHandler
  );
  const memberController = new MemberController(
    listWorkspaceMembersHandler,
    removeMemberHandler,
    changeMemberRoleHandler,
    getMemberHandler
  );

  return Object.freeze({
    sessionService,
    controllers: Object.freeze({
      authController,
      workspaceController,
      invitationController,
      memberController,
    }),
  });
}
