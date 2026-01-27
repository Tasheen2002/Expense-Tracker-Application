import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { approvalChainRoutes } from './approval-chain.routes'
import { workflowRoutes } from './workflow.routes'
import { ApprovalChainController } from '../controllers/approval-chain.controller'
import { WorkflowController } from '../controllers/workflow.controller'

interface ApprovalWorkflowServices {
  approvalChainController: ApprovalChainController
  workflowController: WorkflowController
  prisma: PrismaClient
}

export async function registerApprovalWorkflowRoutes(
  fastify: FastifyInstance,
  services: ApprovalWorkflowServices
) {
  // Register approval chain routes
  await approvalChainRoutes(fastify, services.approvalChainController)

  // Register workflow routes
  await workflowRoutes(fastify, services.workflowController)
}
