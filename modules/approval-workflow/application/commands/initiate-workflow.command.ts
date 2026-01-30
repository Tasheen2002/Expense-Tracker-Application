import { ExpenseWorkflowRepository } from "../../domain/repositories/expense-workflow.repository";
import { ApprovalChainRepository } from "../../domain/repositories/approval-chain.repository";
import { ExpenseWorkflow } from "../../domain/entities/expense-workflow.entity";
import {
  WorkflowAlreadyExistsError,
  NoMatchingApprovalChainError,
} from "../../domain/errors/approval-workflow.errors";

export interface InitiateWorkflowInput {
  expenseId: string;
  workspaceId: string;
  userId: string;
  amount: number;
  categoryId?: string;
  hasReceipt: boolean;
}

export class InitiateWorkflowHandler {
  constructor(
    private readonly workflowRepository: ExpenseWorkflowRepository,
    private readonly chainRepository: ApprovalChainRepository,
  ) {}

  async handle(input: InitiateWorkflowInput): Promise<ExpenseWorkflow> {
    const existing = await this.workflowRepository.findByExpenseId(
      input.expenseId,
    );
    if (existing) {
      throw new WorkflowAlreadyExistsError(input.expenseId);
    }

    const chain = await this.chainRepository.findApplicableChain({
      workspaceId: input.workspaceId,
      amount: input.amount,
      categoryId: input.categoryId,
      hasReceipt: input.hasReceipt,
    });

    if (!chain) {
      throw new NoMatchingApprovalChainError(input.workspaceId, input.amount);
    }

    const workflow = ExpenseWorkflow.create({
      expenseId: input.expenseId,
      workspaceId: input.workspaceId,
      userId: input.userId,
      chainId: chain.getId().getValue(),
      approverSequence: chain.getApproverSequence().map((id) => id.getValue()),
    });

    workflow.start();

    await this.workflowRepository.save(workflow);

    return workflow;
  }
}
