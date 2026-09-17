import { PrismaClient } from './generated/prisma-client';
import { getEventBus } from '@core/domain/events/in-memory-event-bus';
import { InMemoryCacheService } from '@shared/infrastructure/cache/cache.service';

import { UserRepositoryImpl } from './modules/identity-workspace/infrastructure/persistence/user.repository.impl';
import { WorkspaceRepositoryImpl } from './modules/identity-workspace/infrastructure/persistence/workspace.repository.impl';
import { WorkspaceMembershipRepositoryImpl } from './modules/identity-workspace/infrastructure/persistence/workspace-membership.repository.impl';
import { WorkspaceInvitationRepositoryImpl } from './modules/identity-workspace/infrastructure/persistence/workspace-invitation.repository.impl';

import { UserManagementService } from './modules/identity-workspace/application/services/user-management.service';
import { WorkspaceManagementService } from './modules/identity-workspace/application/services/workspace-management.service';
import { WorkspaceMembershipService } from './modules/identity-workspace/application/services/workspace-membership.service';
import { WorkspaceInvitationService } from './modules/identity-workspace/application/services/workspace-invitation.service';

import { RegisterUserHandler } from './modules/identity-workspace/application/commands/register-user.command';
import { LoginUserHandler } from './modules/identity-workspace/application/queries/login-user.query';
import { GetUserHandler } from './modules/identity-workspace/application/queries/get-user.query';
import { CreateWorkspaceHandler } from './modules/identity-workspace/application/commands/create-workspace.command';
import { UpdateWorkspaceHandler } from './modules/identity-workspace/application/commands/update-workspace.command';
import { DeleteWorkspaceHandler } from './modules/identity-workspace/application/commands/delete-workspace.command';
import { GetWorkspaceByIdHandler } from './modules/identity-workspace/application/queries/get-workspace-by-id.query';
import { GetUserWorkspacesHandler } from './modules/identity-workspace/application/queries/get-user-workspaces.query';
import { CreateInvitationHandler } from './modules/identity-workspace/application/commands/create-invitation.command';
import { AcceptInvitationHandler } from './modules/identity-workspace/application/commands/accept-invitation.command';
import { CancelInvitationHandler } from './modules/identity-workspace/application/commands/cancel-invitation.command';
import { GetInvitationByTokenHandler } from './modules/identity-workspace/application/queries/get-invitation-by-token.query';
import { GetWorkspaceInvitationsHandler } from './modules/identity-workspace/application/queries/get-workspace-invitations.query';
import { GetPendingInvitationsHandler } from './modules/identity-workspace/application/queries/get-pending-invitations.query';
import { ListWorkspaceMembersHandler } from './modules/identity-workspace/application/queries/list-workspace-members.query';
import { RemoveMemberHandler } from './modules/identity-workspace/application/commands/remove-member.command';
import { ChangeMemberRoleHandler } from './modules/identity-workspace/application/commands/change-member-role.command';

import { WorkspaceAuthHelper } from './modules/identity-workspace/infrastructure/http/middleware/workspace-auth.helper';
import { AuthController } from './modules/identity-workspace/infrastructure/http/controllers/auth.controller';
import { WorkspaceController } from './modules/identity-workspace/infrastructure/http/controllers/workspace.controller';
import { InvitationController } from './modules/identity-workspace/infrastructure/http/controllers/invitation.controller';
import { MemberController } from './modules/identity-workspace/infrastructure/http/controllers/member.controller';

export class Container {
  private static instance: Container;
  private services: Map<string, unknown> = new Map();

  private constructor() {}

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  register(prisma: PrismaClient): void {
    const eventBus = getEventBus();
    const cacheService = new InMemoryCacheService();

    // Repositories
    const userRepository = new UserRepositoryImpl(prisma as any, eventBus);
    const workspaceRepository = new WorkspaceRepositoryImpl(prisma as any, eventBus);
    const workspaceMembershipRepository = new WorkspaceMembershipRepositoryImpl(
      prisma as any,
      eventBus
    );
    const workspaceInvitationRepository = new WorkspaceInvitationRepositoryImpl(
      prisma as any,
      eventBus
    );

    this.services.set('userRepository', userRepository);
    this.services.set('workspaceRepository', workspaceRepository);
    this.services.set(
      'workspaceMembershipRepository',
      workspaceMembershipRepository
    );
    this.services.set(
      'workspaceInvitationRepository',
      workspaceInvitationRepository
    );

    // Services
    const userManagementService = new UserManagementService(userRepository);
    const workspaceManagementService = new WorkspaceManagementService(
      workspaceRepository,
      workspaceMembershipRepository
    );
    const workspaceMembershipService = new WorkspaceMembershipService(
      workspaceMembershipRepository,
      cacheService
    );
    const workspaceInvitationService = new WorkspaceInvitationService(
      workspaceInvitationRepository,
      workspaceMembershipRepository,
      userRepository
    );

    this.services.set('userManagementService', userManagementService);
    this.services.set('workspaceManagementService', workspaceManagementService);
    this.services.set('workspaceMembershipService', workspaceMembershipService);
    this.services.set('workspaceInvitationService', workspaceInvitationService);

    // Controllers
    const workspaceAuthHelper = new WorkspaceAuthHelper(
      workspaceMembershipService
    );

    const authController = new AuthController(
      new RegisterUserHandler(userManagementService),
      new LoginUserHandler(userManagementService),
      new GetUserHandler(userManagementService)
    );
    const workspaceController = new WorkspaceController(
      new CreateWorkspaceHandler(workspaceManagementService),
      new UpdateWorkspaceHandler(workspaceManagementService),
      new DeleteWorkspaceHandler(workspaceManagementService),
      new GetWorkspaceByIdHandler(workspaceManagementService),
      new GetUserWorkspacesHandler(workspaceManagementService),
      workspaceAuthHelper
    );
    const invitationController = new InvitationController(
      new CreateInvitationHandler(workspaceInvitationService),
      new AcceptInvitationHandler(workspaceInvitationService),
      new CancelInvitationHandler(workspaceInvitationService),
      new GetInvitationByTokenHandler(workspaceInvitationService),
      new GetWorkspaceInvitationsHandler(workspaceInvitationService),
      new GetPendingInvitationsHandler(workspaceInvitationService),
      workspaceAuthHelper
    );
    const memberController = new MemberController(
      new ListWorkspaceMembersHandler(workspaceMembershipService),
      new RemoveMemberHandler(workspaceMembershipService),
      new ChangeMemberRoleHandler(workspaceMembershipService),
      workspaceAuthHelper
    );

    this.services.set('authController', authController);
    this.services.set('workspaceController', workspaceController);
    this.services.set('invitationController', invitationController);
    this.services.set('memberController', memberController);
    this.services.set('prisma', prisma);
  }

  get<T>(serviceName: string): T {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found in container`);
    }
    return service as T;
  }

  getIdentityWorkspaceServices() {
    return {
      authController: this.get<AuthController>('authController'),
      workspaceController: this.get<WorkspaceController>('workspaceController'),
      invitationController: this.get<InvitationController>(
        'invitationController'
      ),
      memberController: this.get<MemberController>('memberController'),
      prisma: this.get<PrismaClient>('prisma'),
    };
  }
}

export const container = Container.getInstance();
