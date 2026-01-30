import { ExpenseWorkflowRepository } from "../../domain/repositories/expense-workflow.repository";
import { ExpenseWorkflow } from "../../domain/entities/expense-workflow.entity";
import {
  WorkflowNotFoundError,
  UnauthorizedApproverError,
  CurrentStepNotFoundError,
} from "../../domain/errors/approval-workflow.errors";

export interface DelegateStepInput {
  expenseId: string;
  fromUserId: string;
  toUserId: string;
}

export class DelegateStepHandler {
  constructor(private readonly workflowRepository: ExpenseWorkflowRepository) {}

  async handle(input: DelegateStepInput): Promise<ExpenseWorkflow> {
    const workflow = await this.workflowRepository.findByExpenseId(
      input.expenseId,
    );

    if (!workflow) {
      throw new WorkflowNotFoundError(input.expenseId);
    }

    const currentStep = workflow.getCurrentStep();
    if (!currentStep) {
      throw new CurrentStepNotFoundError(input.expenseId);
    }

    if (currentStep.getCurrentApproverId().getValue() !== input.fromUserId) {
      throw new UnauthorizedApproverError(
        input.fromUserId,
        currentStep.getId().getValue(),
      );
    }

    currentStep.delegate(input.toUserId);

    await this.workflowRepository.save(workflow);

    return workflow;
  }
}
