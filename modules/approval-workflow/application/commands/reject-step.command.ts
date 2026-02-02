import { ExpenseWorkflowRepository } from "../../domain/repositories/expense-workflow.repository";
import { ExpenseWorkflow } from "../../domain/entities/expense-workflow.entity";
import {
  WorkflowNotFoundError,
  UnauthorizedApproverError,
  CurrentStepNotFoundError,
} from "../../domain/errors/approval-workflow.errors";

export interface RejectStepInput {
  expenseId: string;
  approverId: string;
  comments: string;
}

export class RejectStepHandler {
  constructor(private readonly workflowRepository: ExpenseWorkflowRepository) {}

  async handle(input: RejectStepInput): Promise<ExpenseWorkflow> {
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

    if (currentStep.getCurrentApproverId().getValue() !== input.approverId) {
      throw new UnauthorizedApproverError(
        input.approverId,
        currentStep.getId().getValue(),
      );
    }

    currentStep.reject(input.comments);
    workflow.processStepRejection();

    await this.workflowRepository.save(workflow);

    return workflow;
  }
}
