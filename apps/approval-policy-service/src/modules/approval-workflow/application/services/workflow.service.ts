import { IExpenseWorkflowRepository } from '../../domain/repositories/expense-workflow.repository';
import { IApprovalChainRepository } from '../../domain/repositories/approval-chain.repository';
import { ExpenseWorkflow, ExpenseWorkflowDTO } from '../../domain/entities/expense-workflow.entity';
import { ExpenseId, WorkspaceId, UserId, CategoryId } from '@core/domain/value-objects';
import {
  WorkflowNotFoundError,
  WorkflowAlreadyExistsError,
  UnauthorizedApproverError,
  NoMatchingApprovalChainError,
  SelfApprovalNotAllowedError,
  WorkflowAlreadyCompletedError,
  CurrentStepNotFoundError,
  UnauthorizedWorkflowCancellationError,
  WorkflowStepMismatchError,
  ExpenseSnapshotMismatchError,
  UnauthorizedWorkflowInitiationError,
  ExpenseNotSubmittedError,
} from '../../domain/errors/approval-workflow.errors';
import { IWorkspaceAuthorizationService } from '../../../../shared/ports/workspace-authorization.port';
import { IExpenseSnapshotService } from '../../../../shared/ports/expense-snapshot.port';
import { AUTO_APPROVAL_THRESHOLD } from '../../domain/constants/approval-workflow.constants';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export interface InitiateWorkflowParams {
  expenseId: string;
  workspaceId: string;
  userId: string;
  authToken?: string;
}

export interface WorkflowWorkspaceParams {
  expenseId: string;
  workspaceId: string;
}

export interface ApproveStepParams {
  expenseId: string;
  workspaceId: string;
  approverId: string;
  expectedStepNumber: number;
  comments?: string;
}

export interface RejectStepParams {
  expenseId: string;
  workspaceId: string;
  approverId: string;
  comments: string;
}

export interface DelegateStepParams {
  expenseId: string;
  workspaceId: string;
  fromUserId: string;
  toUserId: string;
  authToken?: string;
}

export interface CancelWorkflowParams {
  expenseId: string;
  workspaceId: string;
  actorId: string;
  reason?: string;
}

export interface ListPendingApprovalsParams {
  approverId: string;
  workspaceId: string;
  options?: PaginationOptions;
}

export interface ListUserWorkflowsParams {
  userId: string;
  workspaceId: string;
  options?: PaginationOptions;
}

export class WorkflowService {
  constructor(
    private readonly workflowRepository: IExpenseWorkflowRepository,
    private readonly chainRepository: IApprovalChainRepository,
    private readonly workspaceAuthService: IWorkspaceAuthorizationService,
    private readonly expenseSnapshotService: IExpenseSnapshotService
  ) {}

  async initiateWorkflow(params: InitiateWorkflowParams): Promise<ExpenseWorkflowDTO> {
    const expId = ExpenseId.fromString(params.expenseId);
    const wsId = WorkspaceId.fromString(params.workspaceId);
    const requesterId = UserId.fromString(params.userId);

    const existing = await this.workflowRepository.findByExpenseId(expId);
    if (existing) {
      throw new WorkflowAlreadyExistsError(params.expenseId);
    }

    // Authoritative facts resolution:
    // ALWAYS load trusted facts from expense-budgeting-service via IExpenseSnapshotService
    // Caller-supplied facts are strictly prohibited to guarantee security and prevent auto-approval fraud.
    const snapshot = await this.expenseSnapshotService.getExpenseSnapshot({
      workspaceId: params.workspaceId,
      expenseId: params.expenseId,
      userId: params.userId,
      authToken: params.authToken,
    });

    if (snapshot.expenseId !== params.expenseId) {
      throw new ExpenseSnapshotMismatchError(params.expenseId);
    }

    if (snapshot.workspaceId !== params.workspaceId) {
      throw new UnauthorizedWorkflowInitiationError(params.expenseId);
    }

    if (snapshot.userId !== params.userId) {
      throw new UnauthorizedWorkflowInitiationError(params.expenseId);
    }

    if (!snapshot.status || snapshot.status.toUpperCase() !== 'SUBMITTED') {
      throw new ExpenseNotSubmittedError(params.expenseId, snapshot.status);
    }

    const authoritativeAmount = snapshot.amount;
    const authoritativeCategoryId = snapshot.categoryId;
    const authoritativeHasReceipt = snapshot.hasReceipt;

    const chain = await this.chainRepository.findApplicableChain({
      workspaceId: wsId,
      amount: authoritativeAmount,
      categoryId: authoritativeCategoryId ? CategoryId.fromString(authoritativeCategoryId) : undefined,
      hasReceipt: authoritativeHasReceipt,
    });

    if (!chain) {
      throw new NoMatchingApprovalChainError(params.workspaceId, authoritativeAmount);
    }

    // CRITICAL: Prevent self-approval (fraud prevention) via Value Object comparison
    if (chain.approverSequence.some((id) => id.equals(requesterId))) {
      throw new SelfApprovalNotAllowedError(params.userId);
    }

    const approverIds = chain.approverSequence.map((id) => id.getValue());
    const workflow = ExpenseWorkflow.create({
      expenseId: params.expenseId,
      workspaceId: params.workspaceId,
      userId: params.userId,
      chainId: chain.id.getValue(),
      approverSequence: approverIds,
    });

    workflow.start();

    // Auto-approval: Expenses below threshold don't need manual approval
    if (authoritativeAmount <= AUTO_APPROVAL_THRESHOLD) {
      workflow.autoApproveAll();
      await this.workflowRepository.save(workflow);
      return ExpenseWorkflow.toDTO(workflow);
    }

    await this.workflowRepository.save(workflow);
    return ExpenseWorkflow.toDTO(workflow);
  }

  async getWorkflow(params: WorkflowWorkspaceParams): Promise<ExpenseWorkflowDTO>;
  async getWorkflow(expenseId: string, workspaceId: string): Promise<ExpenseWorkflowDTO>;
  async getWorkflow(
    expenseIdOrParams: string | WorkflowWorkspaceParams,
    workspaceId?: string
  ): Promise<ExpenseWorkflowDTO> {
    const expIdStr =
      typeof expenseIdOrParams === 'string'
        ? expenseIdOrParams
        : expenseIdOrParams.expenseId;
    const wsIdStr =
      typeof expenseIdOrParams === 'string'
        ? workspaceId!
        : expenseIdOrParams.workspaceId;

    const expId = ExpenseId.fromString(expIdStr);
    const wsId = WorkspaceId.fromString(wsIdStr);
    const workflow = await this.workflowRepository.findByExpenseId(expId);

    if (!workflow || !workflow.workspaceId.equals(wsId)) {
      throw new WorkflowNotFoundError(expIdStr);
    }

    return ExpenseWorkflow.toDTO(workflow);
  }

  async approveStep(params: ApproveStepParams): Promise<ExpenseWorkflowDTO> {
    const expId = ExpenseId.fromString(params.expenseId);
    const wsId = WorkspaceId.fromString(params.workspaceId);
    const workflow = await this.workflowRepository.findByExpenseId(expId);

    if (!workflow || !workflow.workspaceId.equals(wsId)) {
      throw new WorkflowNotFoundError(params.expenseId);
    }

    const normalizedApprover = params.approverId.toLowerCase();

    // 1. Idempotent retry check: verify if the expected step was already approved by this approver.
    // Must run BEFORE the completed check so that final-step retries on completed workflows succeed idempotently!
    const targetStep = workflow.steps.find((s) => s.stepNumber === params.expectedStepNumber);
    if (
      targetStep &&
      targetStep.status === 'approved' &&
      (targetStep.delegatedTo || targetStep.approverId).toLowerCase() === normalizedApprover
    ) {
      return ExpenseWorkflow.toDTO(workflow);
    }

    // 2. Guard: Check if workflow is already completed
    if (workflow.isCompleted()) {
      throw new WorkflowAlreadyCompletedError(
        params.expenseId,
        workflow.status
      );
    }

    // 3. Step validation: verify expectedStepNumber matches current step
    if (params.expectedStepNumber !== workflow.currentStepNumber) {
      throw new WorkflowStepMismatchError(
        params.expectedStepNumber,
        workflow.currentStepNumber
      );
    }

    const currentStep = workflow.getCurrentStep();
    if (!currentStep) {
      throw new CurrentStepNotFoundError(params.expenseId);
    }

    const currentApproverId = (currentStep.delegatedTo || currentStep.approverId).toLowerCase();
    if (currentApproverId !== normalizedApprover) {
      throw new UnauthorizedApproverError(
        params.approverId,
        currentStep.stepId
      );
    }

    workflow.approveCurrentStep(params.comments);

    await this.workflowRepository.save(workflow);

    return ExpenseWorkflow.toDTO(workflow);
  }

  async rejectStep(params: RejectStepParams): Promise<ExpenseWorkflowDTO> {
    const expId = ExpenseId.fromString(params.expenseId);
    const wsId = WorkspaceId.fromString(params.workspaceId);
    const workflow = await this.workflowRepository.findByExpenseId(expId);

    if (!workflow || !workflow.workspaceId.equals(wsId)) {
      throw new WorkflowNotFoundError(params.expenseId);
    }

    // Guard: Check if workflow is already completed
    if (workflow.isCompleted()) {
      throw new WorkflowAlreadyCompletedError(
        params.expenseId,
        workflow.status
      );
    }

    const currentStep = workflow.getCurrentStep();
    if (!currentStep) {
      throw new CurrentStepNotFoundError(params.expenseId);
    }

    const currentApproverId = (currentStep.delegatedTo || currentStep.approverId).toLowerCase();
    const normalizedApprover = params.approverId.toLowerCase();

    if (currentApproverId !== normalizedApprover) {
      throw new UnauthorizedApproverError(
        params.approverId,
        currentStep.stepId
      );
    }

    workflow.rejectCurrentStep(params.comments);

    await this.workflowRepository.save(workflow);

    return ExpenseWorkflow.toDTO(workflow);
  }

  async delegateStep(params: DelegateStepParams): Promise<ExpenseWorkflowDTO> {
    const expId = ExpenseId.fromString(params.expenseId);
    const wsId = WorkspaceId.fromString(params.workspaceId);
    const workflow = await this.workflowRepository.findByExpenseId(expId);

    if (!workflow || !workflow.workspaceId.equals(wsId)) {
      throw new WorkflowNotFoundError(params.expenseId);
    }

    // Guard: Check if workflow is already completed
    if (workflow.isCompleted()) {
      throw new WorkflowAlreadyCompletedError(
        params.expenseId,
        workflow.status
      );
    }

    const currentStep = workflow.getCurrentStep();
    if (!currentStep) {
      throw new CurrentStepNotFoundError(params.expenseId);
    }

    const currentApproverId = (currentStep.delegatedTo || currentStep.approverId).toLowerCase();
    const normalizedFromUser = params.fromUserId.toLowerCase();

    if (currentApproverId !== normalizedFromUser) {
      throw new UnauthorizedApproverError(
        params.fromUserId,
        currentStep.stepId
      );
    }

    // Verify target user is an active member of the workspace (fail-closed)
    await this.workspaceAuthService.authorize({
      userId: params.toUserId,
      workspaceId: params.workspaceId,
      authToken: params.authToken,
    });

    workflow.delegateCurrentStep(params.toUserId);

    await this.workflowRepository.save(workflow);

    return ExpenseWorkflow.toDTO(workflow);
  }

  async cancelWorkflow(params: CancelWorkflowParams): Promise<ExpenseWorkflowDTO>;
  async cancelWorkflow(
    expenseId: string,
    workspaceId: string,
    actorId: string,
    reason?: string
  ): Promise<ExpenseWorkflowDTO>;
  async cancelWorkflow(
    expenseIdOrParams: string | CancelWorkflowParams,
    workspaceId?: string,
    actorId?: string,
    reason?: string
  ): Promise<ExpenseWorkflowDTO> {
    const p: CancelWorkflowParams =
      typeof expenseIdOrParams === 'string'
        ? {
            expenseId: expenseIdOrParams,
            workspaceId: workspaceId!,
            actorId: actorId!,
            reason,
          }
        : expenseIdOrParams;

    const expId = ExpenseId.fromString(p.expenseId);
    const wsId = WorkspaceId.fromString(p.workspaceId);
    const actorUserId = UserId.fromString(p.actorId);
    const workflow = await this.workflowRepository.findByExpenseId(expId);

    if (!workflow || !workflow.workspaceId.equals(wsId)) {
      throw new WorkflowNotFoundError(p.expenseId);
    }

    if (!workflow.userId.equals(actorUserId)) {
      throw new UnauthorizedWorkflowCancellationError(p.actorId, p.expenseId);
    }

    workflow.cancel(p.actorId, p.reason);
    await this.workflowRepository.save(workflow);

    return ExpenseWorkflow.toDTO(workflow);
  }

  async listPendingApprovals(params: ListPendingApprovalsParams): Promise<PaginatedResult<ExpenseWorkflowDTO>>;
  async listPendingApprovals(
    approverId: string,
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ExpenseWorkflowDTO>>;
  async listPendingApprovals(
    approverIdOrParams: string | ListPendingApprovalsParams,
    workspaceId?: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ExpenseWorkflowDTO>> {
    const approverId =
      typeof approverIdOrParams === 'string'
        ? approverIdOrParams
        : approverIdOrParams.approverId;
    const wsIdStr =
      typeof approverIdOrParams === 'string'
        ? workspaceId!
        : approverIdOrParams.workspaceId;
    const pagination =
      typeof approverIdOrParams === 'string'
        ? options
        : approverIdOrParams.options;

    const appId = UserId.fromString(approverId);
    const wsId = WorkspaceId.fromString(wsIdStr);
    const result = await this.workflowRepository.findPendingByApproverId(
      appId,
      wsId,
      pagination
    );
    return { ...result, items: result.items.map((w) => ExpenseWorkflow.toDTO(w)) };
  }

  async listUserWorkflows(params: ListUserWorkflowsParams): Promise<PaginatedResult<ExpenseWorkflowDTO>>;
  async listUserWorkflows(
    userId: string,
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ExpenseWorkflowDTO>>;
  async listUserWorkflows(
    userIdOrParams: string | ListUserWorkflowsParams,
    workspaceId?: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ExpenseWorkflowDTO>> {
    const userId =
      typeof userIdOrParams === 'string'
        ? userIdOrParams
        : userIdOrParams.userId;
    const wsIdStr =
      typeof userIdOrParams === 'string'
        ? workspaceId!
        : userIdOrParams.workspaceId;
    const pagination =
      typeof userIdOrParams === 'string'
        ? options
        : userIdOrParams.options;

    const uId = UserId.fromString(userId);
    const wsId = WorkspaceId.fromString(wsIdStr);
    const result = await this.workflowRepository.findByUserId(
      uId,
      wsId,
      pagination
    );
    return { ...result, items: result.items.map((w) => ExpenseWorkflow.toDTO(w)) };
  }
}
