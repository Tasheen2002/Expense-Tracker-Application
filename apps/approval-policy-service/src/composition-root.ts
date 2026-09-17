import { PrismaClient } from './shared/infrastructure/persistence/prisma.client';
import { InMemoryEventBus } from '@expense-tracker/core';

// Outbox repo
import { PrismaOutboxEventRepository } from './outbox/prisma-outbox.repository';

// Repositories - approval-workflow
import { PrismaApprovalChainRepository } from './modules/approval-workflow/infrastructure/persistence/approval-chain.repository.impl';
import { PrismaExpenseWorkflowRepository } from './modules/approval-workflow/infrastructure/persistence/expense-workflow.repository.impl';

// Services - approval-workflow
import { ApprovalChainService } from './modules/approval-workflow/application/services/approval-chain.service';
import { WorkflowService } from './modules/approval-workflow/application/services/workflow.service';
import { OperationService } from './modules/approval-workflow/application/services/operation.service';
import { IWorkspaceAuthorizationService } from './shared/ports/workspace-authorization.port';
import { HttpWorkspaceAuthorizationAdapter } from './shared/infrastructure/auth/http-workspace-authorization.adapter';
import { IExpenseSnapshotService } from './shared/ports/expense-snapshot.port';
import { HttpExpenseSnapshotAdapter } from './shared/infrastructure/expense/http-expense-snapshot.adapter';

// Command/Query Handlers - approval-workflow
import { CreateApprovalChainHandler } from './modules/approval-workflow/application/commands/create-approval-chain.command';
import { UpdateApprovalChainHandler } from './modules/approval-workflow/application/commands/update-approval-chain.command';
import { DeleteApprovalChainHandler } from './modules/approval-workflow/application/commands/delete-approval-chain.command';
import { ActivateApprovalChainHandler } from './modules/approval-workflow/application/commands/activate-approval-chain.command';
import { DeactivateApprovalChainHandler } from './modules/approval-workflow/application/commands/deactivate-approval-chain.command';
import { GetApprovalChainHandler } from './modules/approval-workflow/application/queries/get-approval-chain.query';
import { ListApprovalChainsHandler } from './modules/approval-workflow/application/queries/list-approval-chains.query';

import { InitiateWorkflowHandler } from './modules/approval-workflow/application/commands/initiate-workflow.command';
import { ApproveStepHandler } from './modules/approval-workflow/application/commands/approve-step.command';
import { RejectStepHandler } from './modules/approval-workflow/application/commands/reject-step.command';
import { DelegateStepHandler } from './modules/approval-workflow/application/commands/delegate-step.command';
import { CancelWorkflowHandler } from './modules/approval-workflow/application/commands/cancel-workflow.command';
import { GetWorkflowHandler } from './modules/approval-workflow/application/queries/get-workflow.query';
import { ListPendingApprovalsHandler } from './modules/approval-workflow/application/queries/list-pending-approvals.query';
import { ListUserWorkflowsHandler } from './modules/approval-workflow/application/queries/list-user-workflows.query';

// Controllers - approval-workflow
import { ApprovalChainController } from './modules/approval-workflow/infrastructure/http/controllers/approval-chain.controller';
import { WorkflowController } from './modules/approval-workflow/infrastructure/http/controllers/workflow.controller';

// Repositories - policy-controls
import { PrismaPolicyRepository } from './modules/policy-controls/infrastructure/persistence/policy.repository.impl';
import { PrismaViolationRepository } from './modules/policy-controls/infrastructure/persistence/violation.repository.impl';
import { PrismaExemptionRepository } from './modules/policy-controls/infrastructure/persistence/exemption.repository.impl';

// Services - policy-controls
import { PolicyService } from './modules/policy-controls/application/services/policy.service';
import { ViolationService } from './modules/policy-controls/application/services/violation.service';
import { ExemptionService } from './modules/policy-controls/application/services/exemption.service';
import { PolicyEvaluationService } from './modules/policy-controls/application/services/policy-evaluation.service';

// Handlers - policy-controls
import { CreatePolicyHandler } from './modules/policy-controls/application/commands/create-policy.command';
import { UpdatePolicyHandler } from './modules/policy-controls/application/commands/update-policy.command';
import { ActivatePolicyHandler } from './modules/policy-controls/application/commands/activate-policy.command';
import { DeactivatePolicyHandler } from './modules/policy-controls/application/commands/deactivate-policy.command';
import { DeletePolicyHandler } from './modules/policy-controls/application/commands/delete-policy.command';
import { GetPolicyHandler } from './modules/policy-controls/application/queries/get-policy.query';
import { ListPoliciesHandler } from './modules/policy-controls/application/queries/list-policies.query';
import { CheckExpenseHandler } from './modules/policy-controls/application/queries/check-expense.query';

import { GetViolationHandler } from './modules/policy-controls/application/queries/get-violation.query';
import { ListViolationsHandler } from './modules/policy-controls/application/queries/list-violations.query';
import { GetViolationStatsHandler } from './modules/policy-controls/application/queries/get-violation-stats.query';
import { AcknowledgeViolationHandler } from './modules/policy-controls/application/commands/acknowledge-violation.command';
import { ResolveViolationHandler } from './modules/policy-controls/application/commands/resolve-violation.command';
import { ExemptViolationHandler } from './modules/policy-controls/application/commands/exempt-violation.command';
import { OverrideViolationHandler } from './modules/policy-controls/application/commands/override-violation.command';
import { RecordViolationHandler } from './modules/policy-controls/application/commands/record-violation.command';

import { GetExemptionHandler } from './modules/policy-controls/application/queries/get-exemption.query';
import { ListExemptionsHandler } from './modules/policy-controls/application/queries/list-exemptions.query';
import { CheckActiveExemptionHandler } from './modules/policy-controls/application/queries/check-active-exemption.query';
import { RequestExemptionHandler } from './modules/policy-controls/application/commands/request-exemption.command';
import { ApproveExemptionHandler } from './modules/policy-controls/application/commands/approve-exemption.command';
import { RejectExemptionHandler } from './modules/policy-controls/application/commands/reject-exemption.command';
import { ExpireExemptionsHandler } from './modules/policy-controls/application/commands/expire-exemptions.command';

import { EvaluateExpenseHandler } from './modules/policy-controls/application/commands/evaluate-expense.command';

// Controllers - policy-controls
import { PolicyController } from './modules/policy-controls/infrastructure/http/controllers/policy.controller';
import { ViolationController } from './modules/policy-controls/infrastructure/http/controllers/violation.controller';
import { ExemptionController } from './modules/policy-controls/infrastructure/http/controllers/exemption.controller';

export interface ApprovalWorkflowServices {
  readonly approvalChainController: ApprovalChainController;
  readonly workflowController: WorkflowController;
  readonly prisma: PrismaClient;
}

export interface PolicyControlsServices {
  readonly policyController: PolicyController;
  readonly violationController: ViolationController;
  readonly exemptionController: ExemptionController;
  readonly evaluateExpenseHandler: EvaluateExpenseHandler;
  readonly checkExpenseHandler: CheckExpenseHandler;
  readonly recordViolationHandler: RecordViolationHandler;
  readonly expireExemptionsHandler: ExpireExemptionsHandler;
  readonly prisma: PrismaClient;
}

export interface CompositionRoot {
  readonly approvalWorkflow: ApprovalWorkflowServices;
  readonly policyControls: PolicyControlsServices;
  readonly outboxEventRepository: PrismaOutboxEventRepository;
}

export interface CompositionRootOptions {
  eventBus?: InMemoryEventBus;
  workspaceAuthorizationService?: IWorkspaceAuthorizationService;
  expenseSnapshotService?: IExpenseSnapshotService;
}

/**
 * Pure Composition Root factory.
 * Constructs the entire service dependency graph bottom-up with:
 * - Zero mutable maps
 * - Zero string-based lookups
 * - Compile-time type safety
 * - Frozen public structure
 */
export function createCompositionRoot(
  prisma: PrismaClient,
  options?: CompositionRootOptions
): CompositionRoot {
  const eventBus = options?.eventBus ?? new InMemoryEventBus();

  // 1. Persistence Layer
  const approvalChainRepository = new PrismaApprovalChainRepository(prisma, eventBus);
  const expenseWorkflowRepository = new PrismaExpenseWorkflowRepository(prisma, eventBus);
  const policyRepository = new PrismaPolicyRepository(prisma, eventBus);
  const violationRepository = new PrismaViolationRepository(prisma, eventBus);
  const exemptionRepository = new PrismaExemptionRepository(prisma, eventBus);
  const outboxEventRepository = new PrismaOutboxEventRepository(prisma);

  // 2. Application Services
  const workspaceAuthService =
    options?.workspaceAuthorizationService ||
    new HttpWorkspaceAuthorizationAdapter();
  const expenseSnapshotService =
    options?.expenseSnapshotService ||
    new HttpExpenseSnapshotAdapter();
  const operationService = new OperationService(workspaceAuthService);
  const approvalChainService = new ApprovalChainService(
    approvalChainRepository,
    workspaceAuthService
  );
  const workflowService = new WorkflowService(
    expenseWorkflowRepository,
    approvalChainRepository,
    workspaceAuthService,
    expenseSnapshotService
  );
  const policyService = new PolicyService(policyRepository);
  const violationService = new ViolationService(
    violationRepository,
    exemptionRepository,
    policyRepository,
    expenseSnapshotService
  );
  const exemptionService = new ExemptionService(exemptionRepository, policyRepository);
  const policyEvaluationService = new PolicyEvaluationService(
    policyRepository,
    violationRepository,
    exemptionRepository
  );

  // 3. Approval Workflow Handlers & Controllers
  const createApprovalChainHandler = new CreateApprovalChainHandler(approvalChainService, operationService);
  const updateApprovalChainHandler = new UpdateApprovalChainHandler(approvalChainService, operationService);
  const deleteApprovalChainHandler = new DeleteApprovalChainHandler(approvalChainService, operationService);
  const getApprovalChainHandler = new GetApprovalChainHandler(approvalChainService, operationService);
  const listApprovalChainsHandler = new ListApprovalChainsHandler(approvalChainService, operationService);
  const activateApprovalChainHandler = new ActivateApprovalChainHandler(approvalChainService, operationService);
  const deactivateApprovalChainHandler = new DeactivateApprovalChainHandler(approvalChainService, operationService);

  const initiateWorkflowHandler = new InitiateWorkflowHandler(workflowService, operationService);
  const approveStepHandler = new ApproveStepHandler(workflowService, operationService);
  const rejectStepHandler = new RejectStepHandler(workflowService, operationService);
  const delegateStepHandler = new DelegateStepHandler(workflowService, operationService);
  const cancelWorkflowHandler = new CancelWorkflowHandler(workflowService, operationService);
  const getWorkflowHandler = new GetWorkflowHandler(workflowService, operationService);
  const listPendingApprovalsHandler = new ListPendingApprovalsHandler(workflowService, operationService);
  const listUserWorkflowsHandler = new ListUserWorkflowsHandler(workflowService, operationService);

  const approvalChainController = new ApprovalChainController(
    createApprovalChainHandler,
    updateApprovalChainHandler,
    deleteApprovalChainHandler,
    getApprovalChainHandler,
    listApprovalChainsHandler,
    activateApprovalChainHandler,
    deactivateApprovalChainHandler
  );

  const workflowController = new WorkflowController(
    initiateWorkflowHandler,
    approveStepHandler,
    rejectStepHandler,
    delegateStepHandler,
    cancelWorkflowHandler,
    getWorkflowHandler,
    listPendingApprovalsHandler,
    listUserWorkflowsHandler
  );

  // 4. Policy Controls Handlers & Controllers
  const createPolicyHandler = new CreatePolicyHandler(policyService, operationService);
  const updatePolicyHandler = new UpdatePolicyHandler(policyService, operationService);
  const activatePolicyHandler = new ActivatePolicyHandler(policyService, operationService);
  const deactivatePolicyHandler = new DeactivatePolicyHandler(policyService, operationService);
  const deletePolicyHandler = new DeletePolicyHandler(policyService, operationService);
  const getPolicyHandler = new GetPolicyHandler(policyService, operationService);
  const listPoliciesHandler = new ListPoliciesHandler(policyService, operationService);

  const getViolationHandler = new GetViolationHandler(violationService, operationService);
  const listViolationsHandler = new ListViolationsHandler(violationService, operationService);
  const getViolationStatsHandler = new GetViolationStatsHandler(violationService, operationService);
  const acknowledgeViolationHandler = new AcknowledgeViolationHandler(violationService, operationService);
  const resolveViolationHandler = new ResolveViolationHandler(violationService, operationService);
  const exemptViolationHandler = new ExemptViolationHandler(violationService, operationService);
  const overrideViolationHandler = new OverrideViolationHandler(violationService, operationService);
  const recordViolationHandler = new RecordViolationHandler(violationService, operationService);

  const getExemptionHandler = new GetExemptionHandler(exemptionService, operationService);
  const listExemptionsHandler = new ListExemptionsHandler(exemptionService, operationService);
  const checkActiveExemptionHandler = new CheckActiveExemptionHandler(exemptionService, operationService);
  const requestExemptionHandler = new RequestExemptionHandler(exemptionService, operationService);
  const approveExemptionHandler = new ApproveExemptionHandler(exemptionService, operationService);
  const rejectExemptionHandler = new RejectExemptionHandler(exemptionService, operationService);
  const expireExemptionsHandler = new ExpireExemptionsHandler(exemptionRepository, operationService);

  const checkExpenseHandler = new CheckExpenseHandler(policyEvaluationService, operationService);
  const evaluateExpenseHandler = new EvaluateExpenseHandler(
    policyEvaluationService,
    operationService,
    expenseSnapshotService
  );

  const policyController = new PolicyController(
    createPolicyHandler,
    updatePolicyHandler,
    activatePolicyHandler,
    deactivatePolicyHandler,
    deletePolicyHandler,
    getPolicyHandler,
    listPoliciesHandler,
    evaluateExpenseHandler,
    checkExpenseHandler
  );

  const violationController = new ViolationController(
    getViolationHandler,
    listViolationsHandler,
    getViolationStatsHandler,
    acknowledgeViolationHandler,
    resolveViolationHandler,
    exemptViolationHandler,
    overrideViolationHandler,
    recordViolationHandler
  );

  const exemptionController = new ExemptionController(
    getExemptionHandler,
    listExemptionsHandler,
    checkActiveExemptionHandler,
    requestExemptionHandler,
    approveExemptionHandler,
    rejectExemptionHandler,
    expireExemptionsHandler
  );

  const approvalWorkflow: ApprovalWorkflowServices = Object.freeze({
    approvalChainController,
    workflowController,
    prisma,
  });

  const policyControls: PolicyControlsServices = Object.freeze({
    policyController,
    violationController,
    exemptionController,
    evaluateExpenseHandler,
    checkExpenseHandler,
    recordViolationHandler,
    expireExemptionsHandler,
    prisma,
  });

  return Object.freeze({
    approvalWorkflow,
    policyControls,
    outboxEventRepository,
  });
}
