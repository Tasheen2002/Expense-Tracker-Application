import { IExpenseWorkflowRepository } from '../../domain/repositories/expense-workflow.repository';
import { IApprovalChainRepository } from '../../domain/repositories/approval-chain.repository';
import { ExpenseWorkflow } from '../../domain/entities/expense-workflow.entity';
import {
  WorkflowNotFoundError,
  WorkflowAlreadyExistsError,
  UnauthorizedApproverError,
  NoMatchingApprovalChainError,
  SelfApprovalNotAllowedError,
  WorkflowAlreadyCompletedError,
  CurrentStepNotFoundError,
} from '../../domain/errors/approval-workflow.errors';
import { AUTO_APPROVAL_THRESHOLD } from '../../domain/constants/approval-workflow.constants';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface';

export class WorkflowService {
  constructor(
    private readonly workflowRepository: IExpenseWorkflowRepository,
    private readonly chainRepository: IApprovalChainRepository
  ) {}

  async initiateWorkflow(params: {
    expenseId: string;
    workspaceId: string;
    userId: string;
    amount: number;
    categoryId?: string;
    hasReceipt: boolean;
  }): Promise<ExpenseWorkflow> {
    const existing = await this.workflowRepository.findByExpenseId(
      params.expenseId
    );
    if (existing) {
      throw new WorkflowAlreadyExistsError(params.expenseId);
    }

    const chain = await this.chainRepository.findApplicableChain({
      workspaceId: params.workspaceId,
      amount: params.amount,
      categoryId: params.categoryId,
      hasReceipt: params.hasReceipt,
    });

    if (!chain) {
      throw new NoMatchingApprovalChainError(params.workspaceId, params.amount);
    }

    // CRITICAL: Prevent self-approval (fraud prevention)
    const approverSequence = chain.getApproverSequence();
    const approverIds = approverSequence.map((id) => id.getValue());
    if (approverIds.includes(params.userId)) {
      throw new SelfApprovalNotAllowedError(params.userId);
    }

    const workflow = ExpenseWorkflow.create({
      expenseId: params.expenseId,
      workspaceId: params.workspaceId,
      userId: params.userId,
      chainId: chain.getId().getValue(),
      approverSequence: approverIds,
    });

    workflow.start();

    // Auto-approval: Expenses below threshold don't need manual approval
    if (params.amount <= AUTO_APPROVAL_THRESHOLD) {
      workflow.autoApproveAll();
      await this.workflowRepository.save(workflow);
      return workflow;
    }

    await this.workflowRepository.save(workflow);
    return workflow;
  }

  async getWorkflow(
    expenseId: string,
    workspaceId: string
  ): Promise<ExpenseWorkflow> {
    const workflow = await this.workflowRepository.findByExpenseId(expenseId);

    if (!workflow || workflow.getWorkspaceId().getValue() !== workspaceId) {
      throw new WorkflowNotFoundError(expenseId);
    }

    return workflow;
  }

  async approveStep(params: {
    expenseId: string;
    workspaceId: string;
    approverId: string;
    comments?: string;
  }): Promise<ExpenseWorkflow> {
    const workflow = await this.getWorkflow(
      params.expenseId,
      params.workspaceId
    );

    // Guard: Check if workflow is already completed
    if (workflow.isCompleted()) {
      throw new WorkflowAlreadyCompletedError(
        params.expenseId,
        workflow.getStatus()
      );
    }

    const currentStep = workflow.getCurrentStep();
    if (!currentStep) {
      throw new CurrentStepNotFoundError(params.expenseId);
    }

    if (currentStep.getCurrentApproverId().getValue() !== params.approverId) {
      throw new UnauthorizedApproverError(
        params.approverId,
        currentStep.getId().getValue()
      );
    }

    currentStep.approve(params.comments);
    workflow.processStepApproval(currentStep.getStepNumber());

    await this.workflowRepository.save(workflow);
    return workflow;
  }

  async rejectStep(params: {
    expenseId: string;
    workspaceId: string;
    approverId: string;
    comments: string;
  }): Promise<ExpenseWorkflow> {
    const workflow = await this.getWorkflow(
      params.expenseId,
      params.workspaceId
    );

    // Guard: Check if workflow is already completed
    if (workflow.isCompleted()) {
      throw new WorkflowAlreadyCompletedError(
        params.expenseId,
        workflow.getStatus()
      );
    }

    const currentStep = workflow.getCurrentStep();
    if (!currentStep) {
      throw new CurrentStepNotFoundError(params.expenseId);
    }

    if (currentStep.getCurrentApproverId().getValue() !== params.approverId) {
      throw new UnauthorizedApproverError(
        params.approverId,
        currentStep.getId().getValue()
      );
    }

    currentStep.reject(params.comments);
    workflow.processStepRejection();

    await this.workflowRepository.save(workflow);
    return workflow;
  }

  async delegateStep(params: {
    expenseId: string;
    workspaceId: string;
    fromUserId: string;
    toUserId: string;
  }): Promise<ExpenseWorkflow> {
    const workflow = await this.getWorkflow(
      params.expenseId,
      params.workspaceId
    );

    // Guard: Check if workflow is already completed
    if (workflow.isCompleted()) {
      throw new WorkflowAlreadyCompletedError(
        params.expenseId,
        workflow.getStatus()
      );
    }

    const currentStep = workflow.getCurrentStep();
    if (!currentStep) {
      throw new CurrentStepNotFoundError(params.expenseId);
    }

    if (currentStep.getCurrentApproverId().getValue() !== params.fromUserId) {
      throw new UnauthorizedApproverError(
        params.fromUserId,
        currentStep.getId().getValue()
      );
    }

    currentStep.delegate(params.toUserId);

    await this.workflowRepository.save(workflow);
    return workflow;
  }

  async cancelWorkflow(
    expenseId: string,
    workspaceId: string,
    cancelledBy: string
  ): Promise<ExpenseWorkflow> {
    const workflow = await this.getWorkflow(expenseId, workspaceId);
    workflow.cancel(cancelledBy);
    await this.workflowRepository.save(workflow);
    return workflow;
  }

  async listPendingApprovals(
    approverId: string,
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ExpenseWorkflow>> {
    return await this.workflowRepository.findPendingByApprover(
      approverId,
      workspaceId,
      options
    );
  }

  async listUserWorkflows(
    userId: string,
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ExpenseWorkflow>> {
    return await this.workflowRepository.findByUser(
      userId,
      workspaceId,
      options
    );
  }
}
