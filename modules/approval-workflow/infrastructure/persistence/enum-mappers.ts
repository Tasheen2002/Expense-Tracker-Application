import {
  WorkflowStatus as PrismaWorkflowStatus,
  ApprovalStatus as PrismaApprovalStatus,
} from "@prisma/client";
import { WorkflowStatus } from "../../domain/enums/workflow-status";
import { ApprovalStatus } from "../../domain/enums/approval-status";

const workflowStatusToPrisma: Record<WorkflowStatus, PrismaWorkflowStatus> = {
  [WorkflowStatus.PENDING]: PrismaWorkflowStatus.PENDING,
  [WorkflowStatus.IN_PROGRESS]: PrismaWorkflowStatus.IN_PROGRESS,
  [WorkflowStatus.APPROVED]: PrismaWorkflowStatus.APPROVED,
  [WorkflowStatus.REJECTED]: PrismaWorkflowStatus.REJECTED,
  [WorkflowStatus.CANCELLED]: PrismaWorkflowStatus.CANCELLED,
};

const prismaToWorkflowStatus: Record<PrismaWorkflowStatus, WorkflowStatus> = {
  [PrismaWorkflowStatus.PENDING]: WorkflowStatus.PENDING,
  [PrismaWorkflowStatus.IN_PROGRESS]: WorkflowStatus.IN_PROGRESS,
  [PrismaWorkflowStatus.APPROVED]: WorkflowStatus.APPROVED,
  [PrismaWorkflowStatus.REJECTED]: WorkflowStatus.REJECTED,
  [PrismaWorkflowStatus.CANCELLED]: WorkflowStatus.CANCELLED,
};

const approvalStatusToPrisma: Record<ApprovalStatus, PrismaApprovalStatus> = {
  [ApprovalStatus.PENDING]: PrismaApprovalStatus.PENDING,
  [ApprovalStatus.APPROVED]: PrismaApprovalStatus.APPROVED,
  [ApprovalStatus.REJECTED]: PrismaApprovalStatus.REJECTED,
  [ApprovalStatus.DELEGATED]: PrismaApprovalStatus.DELEGATED,
  [ApprovalStatus.AUTO_APPROVED]: PrismaApprovalStatus.AUTO_APPROVED,
};

const prismaToApprovalStatus: Record<PrismaApprovalStatus, ApprovalStatus> = {
  [PrismaApprovalStatus.PENDING]: ApprovalStatus.PENDING,
  [PrismaApprovalStatus.APPROVED]: ApprovalStatus.APPROVED,
  [PrismaApprovalStatus.REJECTED]: ApprovalStatus.REJECTED,
  [PrismaApprovalStatus.DELEGATED]: ApprovalStatus.DELEGATED,
  [PrismaApprovalStatus.AUTO_APPROVED]: ApprovalStatus.AUTO_APPROVED,
};

export function toDbWorkflowStatus(status: WorkflowStatus): PrismaWorkflowStatus {
  return workflowStatusToPrisma[status];
}

export function fromDbWorkflowStatus(status: PrismaWorkflowStatus): WorkflowStatus {
  return prismaToWorkflowStatus[status];
}

export function toDbApprovalStatus(status: ApprovalStatus): PrismaApprovalStatus {
  return approvalStatusToPrisma[status];
}

export function fromDbApprovalStatus(status: PrismaApprovalStatus): ApprovalStatus {
  return prismaToApprovalStatus[status];
}
