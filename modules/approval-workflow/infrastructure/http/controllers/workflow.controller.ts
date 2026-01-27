import { FastifyRequest, FastifyReply } from 'fastify'
import { WorkflowService } from '../../../application/services/workflow.service'
import { ExpenseWorkflow } from '../../../domain/entities/expense-workflow.entity'
import { ApprovalStep } from '../../../domain/entities/approval-step.entity'
import { ResponseHelper } from '../../../../../apps/api/src/shared/response.helper'

export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService
  ) {}

  async initiateWorkflow(
    request: FastifyRequest<{
      Params: { workspaceId: string }
      Body: {
        expenseId: string
        userId: string
        amount: number
        categoryId?: string
        hasReceipt: boolean
      }
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params

      const workflow = await this.workflowService.initiateWorkflow({
        ...request.body,
        workspaceId,
      })

      return reply.status(201).send({
        success: true,
        statusCode: 201,
        message: 'Workflow initiated successfully',
        data: this.serializeWorkflow(workflow),
      })
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error)
    }
  }

  async getWorkflow(
    request: FastifyRequest<{
      Params: { workspaceId: string; expenseId: string }
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, expenseId } = request.params

      const workflow = await this.workflowService.getWorkflow(expenseId, workspaceId)

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: 'Workflow retrieved successfully',
        data: this.serializeWorkflow(workflow),
      })
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error)
    }
  }

  async approveStep(
    request: FastifyRequest<{
      Params: { workspaceId: string; expenseId: string }
      Body: {
        approverId: string
        comments?: string
      }
    }>,
    reply: FastifyReply
  ) {
    try {
      const { expenseId } = request.params

      const workflow = await this.workflowService.approveStep({
        expenseId,
        ...request.body,
      })

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: 'Step approved successfully',
        data: this.serializeWorkflow(workflow),
      })
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error)
    }
  }

  async rejectStep(
    request: FastifyRequest<{
      Params: { workspaceId: string; expenseId: string }
      Body: {
        approverId: string
        comments: string
      }
    }>,
    reply: FastifyReply
  ) {
    try {
      const { expenseId } = request.params

      const workflow = await this.workflowService.rejectStep({
        expenseId,
        ...request.body,
      })

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: 'Step rejected successfully',
        data: this.serializeWorkflow(workflow),
      })
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error)
    }
  }

  async delegateStep(
    request: FastifyRequest<{
      Params: { workspaceId: string; expenseId: string }
      Body: {
        fromUserId: string
        toUserId: string
      }
    }>,
    reply: FastifyReply
  ) {
    try {
      const { expenseId } = request.params

      const workflow = await this.workflowService.delegateStep({
        expenseId,
        ...request.body,
      })

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: 'Step delegated successfully',
        data: this.serializeWorkflow(workflow),
      })
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error)
    }
  }

  async cancelWorkflow(
    request: FastifyRequest<{
      Params: { workspaceId: string; expenseId: string }
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, expenseId } = request.params

      const workflow = await this.workflowService.cancelWorkflow(expenseId, workspaceId)

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: 'Workflow cancelled successfully',
        data: this.serializeWorkflow(workflow),
      })
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error)
    }
  }

  async listPendingApprovals(
    request: FastifyRequest<{
      Params: { workspaceId: string }
      Querystring: { approverId: string }
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params
      const { approverId } = request.query

      const workflows = await this.workflowService.listPendingApprovals(approverId, workspaceId)

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: 'Pending approvals retrieved successfully',
        data: workflows.map(w => this.serializeWorkflow(w)),
      })
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error)
    }
  }

  async listUserWorkflows(
    request: FastifyRequest<{
      Params: { workspaceId: string }
      Querystring: { userId: string }
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params
      const { userId } = request.query

      const workflows = await this.workflowService.listUserWorkflows(userId, workspaceId)

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: 'User workflows retrieved successfully',
        data: workflows.map(w => this.serializeWorkflow(w)),
      })
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error)
    }
  }

  private serializeWorkflow(workflow: ExpenseWorkflow) {
    return {
      workflowId: workflow.getId(),
      expenseId: workflow.getExpenseId(),
      workspaceId: workflow.getWorkspaceId(),
      userId: workflow.getUserId(),
      chainId: workflow.getChainId(),
      status: workflow.getStatus(),
      currentStepNumber: workflow.getCurrentStepNumber(),
      steps: workflow.getSteps().map(step => this.serializeStep(step)),
      createdAt: workflow.getCreatedAt().toISOString(),
      updatedAt: workflow.getUpdatedAt().toISOString(),
      completedAt: workflow.getCompletedAt()?.toISOString(),
    }
  }

  private serializeStep(step: ApprovalStep) {
    return {
      stepId: step.getId().getValue(),
      workflowId: step.getWorkflowId(),
      stepNumber: step.getStepNumber(),
      approverId: step.getApproverId(),
      delegatedTo: step.getDelegatedTo(),
      status: step.getStatus(),
      comments: step.getComments(),
      processedAt: step.getProcessedAt()?.toISOString(),
      createdAt: step.getCreatedAt().toISOString(),
      updatedAt: step.getUpdatedAt().toISOString(),
    }
  }
}
