import { PrismaClient } from '@prisma/client';
import { getEventBus } from './shared/domain/events/event-bus';
import { InMemoryCacheService } from './shared/infrastructure/cache/cache.service';

// Identity-Workspace Module imports
import { UserRepositoryImpl } from '../../../modules/identity-workspace/infrastructure/persistence/user.repository.impl';
import { WorkspaceRepositoryImpl } from '../../../modules/identity-workspace/infrastructure/persistence/workspace.repository.impl';
import { WorkspaceMembershipRepositoryImpl } from '../../../modules/identity-workspace/infrastructure/persistence/workspace-membership.repository.impl';
import { WorkspaceInvitationRepositoryImpl } from '../../../modules/identity-workspace/infrastructure/persistence/workspace-invitation.repository.impl';
import { UserManagementService } from '../../../modules/identity-workspace/application/services/user-management.service';
import { WorkspaceManagementService } from '../../../modules/identity-workspace/application/services/workspace-management.service';
import { WorkspaceMembershipService } from '../../../modules/identity-workspace/application/services/workspace-membership.service';
import { WorkspaceInvitationService } from '../../../modules/identity-workspace/application/services/workspace-invitation.service';
import { WorkspaceAuthHelper } from '../../../modules/identity-workspace/infrastructure/http/middleware/workspace-auth.helper';

// Identity Handlers
import { RegisterUserHandler } from '../../../modules/identity-workspace/application/commands/register-user.command';
import { CreateWorkspaceHandler } from '../../../modules/identity-workspace/application/commands/create-workspace.command';
import { UpdateWorkspaceHandler } from '../../../modules/identity-workspace/application/commands/update-workspace.command';
import { DeleteWorkspaceHandler } from '../../../modules/identity-workspace/application/commands/delete-workspace.command';
import { CreateInvitationHandler } from '../../../modules/identity-workspace/application/commands/create-invitation.command';
import { AcceptInvitationHandler } from '../../../modules/identity-workspace/application/commands/accept-invitation.command';
import { CancelInvitationHandler } from '../../../modules/identity-workspace/application/commands/cancel-invitation.command';
import { LoginUserHandler } from '../../../modules/identity-workspace/application/queries/login-user.query';
import { GetUserHandler } from '../../../modules/identity-workspace/application/queries/get-user.query';
import { GetWorkspaceByIdHandler } from '../../../modules/identity-workspace/application/queries/get-workspace-by-id.query';
import { GetUserWorkspacesHandler } from '../../../modules/identity-workspace/application/queries/get-user-workspaces.query';
import { GetInvitationByTokenHandler } from '../../../modules/identity-workspace/application/queries/get-invitation-by-token.query';
import { GetWorkspaceInvitationsHandler } from '../../../modules/identity-workspace/application/queries/get-workspace-invitations.query';
import { GetPendingInvitationsHandler } from '../../../modules/identity-workspace/application/queries/get-pending-invitations.query';

// Identity Controllers
import { AuthController } from '../../../modules/identity-workspace/infrastructure/http/controllers/auth.controller';
import { WorkspaceController } from '../../../modules/identity-workspace/infrastructure/http/controllers/workspace.controller';
import { InvitationController } from '../../../modules/identity-workspace/infrastructure/http/controllers/invitation.controller';
import { MemberController } from '../../../modules/identity-workspace/infrastructure/http/controllers/member.controller';

// Bank-Feed-Sync Module imports
import { PrismaBankConnectionRepository } from '../../../modules/bank-feed-sync/infrastructure/persistence/bank-connection.repository.impl';
import { PrismaBankTransactionRepository } from '../../../modules/bank-feed-sync/infrastructure/persistence/bank-transaction.repository.impl';
import { PrismaSyncSessionRepository } from '../../../modules/bank-feed-sync/infrastructure/persistence/sync-session.repository.impl';
import { TransactionSyncService, IBankAPIClient } from '../../../modules/bank-feed-sync/application/services/transaction-sync.service';
import { ConnectBankHandler } from '../../../modules/bank-feed-sync/application/commands/connect-bank.command';
import { DisconnectBankHandler } from '../../../modules/bank-feed-sync/application/commands/disconnect-bank.command';
import { UpdateConnectionTokenHandler } from '../../../modules/bank-feed-sync/application/commands/update-connection-token.command';
import { DeleteConnectionHandler } from '../../../modules/bank-feed-sync/application/commands/delete-connection.command';
import { SyncTransactionsHandler } from '../../../modules/bank-feed-sync/application/commands/sync-transactions.command';
import { ProcessTransactionHandler } from '../../../modules/bank-feed-sync/application/commands/process-transaction.command';
import { GetBankConnectionsHandler } from '../../../modules/bank-feed-sync/application/queries/get-bank-connections.query';
import { GetBankConnectionHandler } from '../../../modules/bank-feed-sync/application/queries/get-bank-connection.query';
import { GetPendingTransactionsHandler } from '../../../modules/bank-feed-sync/application/queries/get-pending-transactions.query';
import { GetBankTransactionHandler } from '../../../modules/bank-feed-sync/application/queries/get-bank-transaction.query';
import { GetSyncSessionHandler } from '../../../modules/bank-feed-sync/application/queries/get-sync-session.query';
import { GetSyncHistoryHandler } from '../../../modules/bank-feed-sync/application/queries/get-sync-history.query';
import { GetActiveSyncsHandler } from '../../../modules/bank-feed-sync/application/queries/get-active-syncs.query';
import { GetTransactionsByConnectionHandler } from '../../../modules/bank-feed-sync/application/queries/get-transactions-by-connection.query';
import { BankConnectionController } from '../../../modules/bank-feed-sync/infrastructure/http/controllers/bank-connection.controller';
import { BankTransactionController } from '../../../modules/bank-feed-sync/infrastructure/http/controllers/bank-transaction.controller';
import { TransactionSyncController } from '../../../modules/bank-feed-sync/infrastructure/http/controllers/transaction-sync.controller';

export class MinimalContainer {
  public services = new Map<string, any>();

  constructor(private readonly prisma: PrismaClient) {
    this.initialize();
  }

  private initialize() {
    const eventBus = getEventBus();
    const cacheService = new InMemoryCacheService();

    // 1. Identity Persistence
    const userRepository = new UserRepositoryImpl(this.prisma, eventBus);
    const workspaceRepository = new WorkspaceRepositoryImpl(this.prisma, eventBus);
    const workspaceMembershipRepository = new WorkspaceMembershipRepositoryImpl(this.prisma, eventBus);
    const workspaceInvitationRepository = new WorkspaceInvitationRepositoryImpl(this.prisma, eventBus);
    
    // 2. Identity Services
    const userManagementService = new UserManagementService(userRepository);
    const workspaceManagementService = new WorkspaceManagementService(workspaceRepository, workspaceMembershipRepository);
    const workspaceMembershipService = new WorkspaceMembershipService(workspaceMembershipRepository, cacheService);
    const workspaceInvitationService = new WorkspaceInvitationService(workspaceInvitationRepository, workspaceMembershipRepository, userRepository);
    const workspaceAuthHelper = new WorkspaceAuthHelper(workspaceMembershipService);

    // 3. Identity Handlers
    const registerUserHandler = new RegisterUserHandler(userManagementService);
    const createWorkspaceHandler = new CreateWorkspaceHandler(workspaceManagementService);
    const updateWorkspaceHandler = new UpdateWorkspaceHandler(workspaceManagementService);
    const deleteWorkspaceHandler = new DeleteWorkspaceHandler(workspaceManagementService);
    const createInvitationHandler = new CreateInvitationHandler(workspaceInvitationService);
    const acceptInvitationHandler = new AcceptInvitationHandler(workspaceInvitationService);
    const cancelInvitationHandler = new CancelInvitationHandler(workspaceInvitationService);

    const loginUserHandler = new LoginUserHandler(userManagementService);
    const getUserHandler = new GetUserHandler(userManagementService);
    const getWorkspaceByIdHandler = new GetWorkspaceByIdHandler(workspaceManagementService);
    const getUserWorkspacesHandler = new GetUserWorkspacesHandler(workspaceManagementService);
    const getInvitationByTokenHandler = new GetInvitationByTokenHandler(workspaceInvitationService);
    const getWorkspaceInvitationsHandler = new GetWorkspaceInvitationsHandler(workspaceInvitationService);
    const getPendingIdentityInvitationsHandler = new GetPendingInvitationsHandler(workspaceInvitationService);

    // 4. Identity Controllers
    const authController = new AuthController(registerUserHandler, loginUserHandler, getUserHandler);
    const workspaceController = new WorkspaceController(
      createWorkspaceHandler,
      updateWorkspaceHandler,
      deleteWorkspaceHandler,
      getWorkspaceByIdHandler,
      getUserWorkspacesHandler,
      workspaceAuthHelper
    );
    const invitationController = new InvitationController(
      createInvitationHandler,
      acceptInvitationHandler,
      cancelInvitationHandler,
      getInvitationByTokenHandler,
      getWorkspaceInvitationsHandler,
      getPendingIdentityInvitationsHandler,
      workspaceAuthHelper
    );
    const memberController = new MemberController(workspaceMembershipService, workspaceAuthHelper);

    // 5. Bank Persistence
    const bankConnectionRepository = new PrismaBankConnectionRepository(this.prisma, eventBus);
    const bankTransactionRepository = new PrismaBankTransactionRepository(this.prisma, eventBus);
    const syncSessionRepository = new PrismaSyncSessionRepository(this.prisma, eventBus);

    // 6. Bank Mock Client
    const mockBankAPIClient: IBankAPIClient = {
      fetchTransactions: async () => []
    };

    // 7. Bank Services
    const transactionSyncService = new TransactionSyncService(
      bankConnectionRepository, 
      syncSessionRepository, 
      bankTransactionRepository, 
      mockBankAPIClient
    );

    // 8. Bank Handlers
    const connectBankHandler = new ConnectBankHandler(bankConnectionRepository);
    const disconnectBankHandler = new DisconnectBankHandler(bankConnectionRepository);
    const updateConnectionTokenHandler = new UpdateConnectionTokenHandler(bankConnectionRepository);
    const deleteConnectionHandler = new DeleteConnectionHandler(bankConnectionRepository);
    const syncTransactionsHandler = new SyncTransactionsHandler(transactionSyncService);
    const processTransactionHandler = new ProcessTransactionHandler(bankTransactionRepository);

    const getBankConnectionsHandler = new GetBankConnectionsHandler(bankConnectionRepository);
    const getBankConnectionHandler = new GetBankConnectionHandler(bankConnectionRepository);
    const getPendingBankTransactionsHandler = new GetPendingTransactionsHandler(bankTransactionRepository);
    const getBankTransactionHandler = new GetBankTransactionHandler(bankTransactionRepository);
    const getSyncSessionHandler = new GetSyncSessionHandler(syncSessionRepository);
    const getSyncHistoryHandler = new GetSyncHistoryHandler(syncSessionRepository);
    const getActiveSyncsHandler = new GetActiveSyncsHandler(syncSessionRepository);
    const getTransactionsByConnectionHandler = new GetTransactionsByConnectionHandler(bankTransactionRepository);

    // 9. Bank Controllers
    const bankConnectionController = new BankConnectionController(
      connectBankHandler,
      disconnectBankHandler,
      updateConnectionTokenHandler,
      deleteConnectionHandler,
      getBankConnectionsHandler,
      getBankConnectionHandler
    );

    const bankTransactionController = new BankTransactionController(
      processTransactionHandler,
      getPendingBankTransactionsHandler,
      getBankTransactionHandler,
      getTransactionsByConnectionHandler
    );

    const transactionSyncController = new TransactionSyncController(
      syncTransactionsHandler,
      getSyncHistoryHandler,
      getSyncSessionHandler,
      getActiveSyncsHandler
    );

    // 10. Register in Map
    this.services.set('authController', authController);
    this.services.set('workspaceController', workspaceController);
    this.services.set('invitationController', invitationController);
    this.services.set('memberController', memberController);
    this.services.set('bankConnectionController', bankConnectionController);
    this.services.set('bankTransactionController', bankTransactionController);
    this.services.set('transactionSyncController', transactionSyncController);

    // Persistence/Services for direct access
    this.services.set('userRepository', userRepository);
    this.services.set('workspaceRepository', workspaceRepository);
    this.services.set('workspaceMembershipRepository', workspaceMembershipRepository);
    this.services.set('workspaceInvitationRepository', workspaceInvitationRepository);
    this.services.set('userManagementService', userManagementService);
    this.services.set('workspaceManagementService', workspaceManagementService);
    this.services.set('workspaceMembershipService', workspaceMembershipService);
    this.services.set('workspaceInvitationService', workspaceInvitationService);
    
    this.services.set('bankConnectionRepository', bankConnectionRepository);
    this.services.set('bankTransactionRepository', bankTransactionRepository);
    this.services.set('syncSessionRepository', syncSessionRepository);
    this.services.set('transactionSyncService', transactionSyncService);
  }

  get<T>(key: string): T {
    return this.services.get(key);
  }
}
