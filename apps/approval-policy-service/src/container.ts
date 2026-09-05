import { PrismaClient } from '@prisma/client';
import { getEventBus, InMemoryEventBus, DomainEvent, DomainEventHandler } from '@expense-tracker/core';

// Outbox repo
import { PrismaOutboxEventRepository } from './repositories/outbox-event.repository';

// Repositories - approval-workflow
import { PrismaApprovalChainRepository } from './modules/approval-workflow/infrastructure/persistence/approval-chain.repository.impl';
import { PrismaExpenseWorkflowRepository } from './modules/approval-workflow/infrastructure/persistence/expense-workflow.repository.impl';

// Services - approval-workflow
import { ApprovalChainService } from './modules/approval-workflow/application/services/approval-chain.service';
import { WorkflowService } from './modules/approval-workflow/application/services/workflow.service';

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

// Handlers - policy-controls
import { CreatePolicyHandler } from './modules/policy-controls/application/commands/create-policy.command';
import { UpdatePolicyHandler } from './modules/policy-controls/application/commands/update-policy.command';
import { ActivatePolicyHandler } from './modules/policy-controls/application/commands/activate-policy.command';
import { DeactivatePolicyHandler } from './modules/policy-controls/application/commands/deactivate-policy.command';
import { DeletePolicyHandler } from './modules/policy-controls/application/commands/delete-policy.command';
import { GetPolicyHandler } from './modules/policy-controls/application/queries/get-policy.query';
import { ListPoliciesHandler } from './modules/policy-controls/application/queries/list-policies.query';

import { GetViolationHandler } from './modules/policy-controls/application/queries/get-violation.query';
import { ListViolationsHandler } from './modules/policy-controls/application/queries/list-violations.query';
import { GetViolationStatsHandler } from './modules/policy-controls/application/queries/get-violation-stats.query';
import { AcknowledgeViolationHandler } from './modules/policy-controls/application/commands/acknowledge-violation.command';
import { ResolveViolationHandler } from './modules/policy-controls/application/commands/resolve-violation.command';
import { ExemptViolationHandler } from './modules/policy-controls/application/commands/exempt-violation.command';
import { OverrideViolationHandler } from './modules/policy-controls/application/commands/override-violation.command';

import { GetExemptionHandler } from './modules/policy-controls/application/queries/get-exemption.query';
import { ListExemptionsHandler } from './modules/policy-controls/application/queries/list-exemptions.query';
import { CheckActiveExemptionHandler } from './modules/policy-controls/application/queries/check-active-exemption.query';
import { RequestExemptionHandler } from './modules/policy-controls/application/commands/request-exemption.command';
import { ApproveExemptionHandler } from './modules/policy-controls/application/commands/approve-exemption.command';
import { RejectExemptionHandler } from './modules/policy-controls/application/commands/reject-exemption.command';

// Controllers - policy-controls
import { PolicyController } from './modules/policy-controls/infrastructure/http/controllers/policy.controller';
import { ViolationController } from './modules/policy-controls/infrastructure/http/controllers/violation.controller';
import { ExemptionController } from './modules/policy-controls/infrastructure/http/controllers/exemption.controller';

class OutboxEventHandler implements DomainEventHandler {
  constructor(
    public readonly eventType: string,
    private readonly prisma: PrismaClient
  ) {}

  async handle(event: DomainEvent): Promise<void> {
    try {
      await this.prisma.outboxEvent.create({
        data: {
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          eventType: event.eventType,
          payload: event.getPayload() as any,
          status: 'PENDING',
        },
      });
    } catch (err) {
      console.error(`[OutboxEventHandler] Failed to persist event ${event.eventType} to outbox:`, err);
    }
  }
}

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
    const eventBus = getEventBus() as InMemoryEventBus;

    // Register outbox event listeners to intercept domain events and write them to outbox
    const eventsToOutbox = [
      'ApprovalChainCreated',
      'ApprovalChainUpdated',
      'ApprovalChainDeleted',
      'ApprovalChainActivated',
      'ApprovalChainDeactivated',
      'WorkflowInitiated',
      'WorkflowStepApproved',
      'WorkflowStepRejected',
      'WorkflowStepDelegated',
      'WorkflowCancelled',
      'WorkflowCompleted',
      'PolicyCreated',
      'PolicyUpdated',
      'PolicyActivated',
      'PolicyDeactivated',
      'PolicyDeleted',
      'PolicyExemptionCreated',
      'PolicyExemptionApproved',
      'PolicyExemptionRejected',
      'PolicyExemptionRevoked',
      'PolicyViolationDetected',
      'PolicyViolationAcknowledged',
      'PolicyViolationResolved',
      'PolicyViolationExempted',
      'PolicyViolationOverridden',
    ];

    for (const eventName of eventsToOutbox) {
      eventBus.subscribe(eventName, new OutboxEventHandler(eventName, prisma));
    }

    // Repositories
    const approvalChainRepository = new PrismaApprovalChainRepository(prisma, eventBus);
    const expenseWorkflowRepository = new PrismaExpenseWorkflowRepository(prisma, eventBus);
    const policyRepository = new PrismaPolicyRepository(prisma, eventBus);
    const violationRepository = new PrismaViolationRepository(prisma, eventBus);
    const exemptionRepository = new PrismaExemptionRepository(prisma, eventBus);
    const outboxEventRepository = new PrismaOutboxEventRepository(prisma);

    this.services.set('approvalChainRepository', approvalChainRepository);
    this.services.set('expenseWorkflowRepository', expenseWorkflowRepository);
    this.services.set('policyRepository', policyRepository);
    this.services.set('violationRepository', violationRepository);
    this.services.set('exemptionRepository', exemptionRepository);
    this.services.set('outboxEventRepository', outboxEventRepository);
    this.services.set('prisma', prisma);

    // Services
    const approvalChainService = new ApprovalChainService(approvalChainRepository);
    const workflowService = new WorkflowService(expenseWorkflowRepository, approvalChainRepository);
    const policyService = new PolicyService(policyRepository);
    const violationService = new ViolationService(violationRepository);
    const exemptionService = new ExemptionService(exemptionRepository);

    this.services.set('approvalChainService', approvalChainService);
    this.services.set('workflowService', workflowService);
    this.services.set('policyService', policyService);
    this.services.set('violationService', violationService);
    this.services.set('exemptionService', exemptionService);

    // Handlers - approval-workflow
    const createApprovalChainHandler = new CreateApprovalChainHandler(approvalChainService);
    const updateApprovalChainHandler = new UpdateApprovalChainHandler(approvalChainService);
    const deleteApprovalChainHandler = new DeleteApprovalChainHandler(approvalChainService);
    const activateApprovalChainHandler = new ActivateApprovalChainHandler(approvalChainService);
    const deactivateApprovalChainHandler = new DeactivateApprovalChainHandler(approvalChainService);
    const getApprovalChainHandler = new GetApprovalChainHandler(approvalChainService);
    const listApprovalChainsHandler = new ListApprovalChainsHandler(approvalChainService);

    const initiateWorkflowHandler = new InitiateWorkflowHandler(workflowService);
    const approveStepHandler = new ApproveStepHandler(workflowService);
    const rejectStepHandler = new RejectStepHandler(workflowService);
    const delegateStepHandler = new DelegateStepHandler(workflowService);
    const cancelWorkflowHandler = new CancelWorkflowHandler(workflowService);
    const getWorkflowHandler = new GetWorkflowHandler(workflowService);
    const listPendingApprovalsHandler = new ListPendingApprovalsHandler(workflowService);
    const listUserWorkflowsHandler = new ListUserWorkflowsHandler(workflowService);

    // Handlers - policy-controls
    const createPolicyHandler = new CreatePolicyHandler(policyService);
    const updatePolicyHandler = new UpdatePolicyHandler(policyService);
    const activatePolicyHandler = new ActivatePolicyHandler(policyService);
    const deactivatePolicyHandler = new DeactivatePolicyHandler(policyService);
    const deletePolicyHandler = new DeletePolicyHandler(policyService);
    const getPolicyHandler = new GetPolicyHandler(policyService);
    const listPoliciesHandler = new ListPoliciesHandler(policyService);

    const getViolationHandler = new GetViolationHandler(violationService);
    const listViolationsHandler = new ListViolationsHandler(violationService);
    const getViolationStatsHandler = new GetViolationStatsHandler(violationService);
    const acknowledgeViolationHandler = new AcknowledgeViolationHandler(violationService);
    const resolveViolationHandler = new ResolveViolationHandler(violationService);
    const exemptViolationHandler = new ExemptViolationHandler(violationService);
    const overrideViolationHandler = new OverrideViolationHandler(violationService);

    const getExemptionHandler = new GetExemptionHandler(exemptionService);
    const listExemptionsHandler = new ListExemptionsHandler(exemptionService);
    const checkActiveExemptionHandler = new CheckActiveExemptionHandler(exemptionService);
    const requestExemptionHandler = new RequestExemptionHandler(exemptionService);
    const approveExemptionHandler = new ApproveExemptionHandler(exemptionService);
    const rejectExemptionHandler = new RejectExemptionHandler(exemptionService);

    // Controllers
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

    const policyController = new PolicyController(
      createPolicyHandler,
      updatePolicyHandler,
      activatePolicyHandler,
      deactivatePolicyHandler,
      deletePolicyHandler,
      getPolicyHandler,
      listPoliciesHandler
    );

    const violationController = new ViolationController(
      getViolationHandler,
      listViolationsHandler,
      getViolationStatsHandler,
      acknowledgeViolationHandler,
      resolveViolationHandler,
      exemptViolationHandler,
      overrideViolationHandler
    );

    const exemptionController = new ExemptionController(
      getExemptionHandler,
      listExemptionsHandler,
      checkActiveExemptionHandler,
      requestExemptionHandler,
      approveExemptionHandler,
      rejectExemptionHandler
    );

    this.services.set('approvalChainController', approvalChainController);
    this.services.set('workflowController', workflowController);
    this.services.set('policyController', policyController);
    this.services.set('violationController', violationController);
    this.services.set('exemptionController', exemptionController);
  }

  get<T>(serviceName: string): T {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found in container`);
    }
    return service as T;
  }

  getApprovalWorkflowServices() {
    return {
      approvalChainController: this.get<ApprovalChainController>('approvalChainController'),
      workflowController: this.get<WorkflowController>('workflowController'),
      prisma: this.get<PrismaClient>('prisma'),
    };
  }

  getPolicyControlsServices() {
    return {
      policyController: this.get<PolicyController>('policyController'),
      violationController: this.get<ViolationController>('violationController'),
      exemptionController: this.get<ExemptionController>('exemptionController'),
      prisma: this.get<PrismaClient>('prisma'),
    };
  }
}

export const container = Container.getInstance();
