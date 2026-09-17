import {
  WorkflowStatus as PrismaWorkflowStatus,
  ApprovalStatus as PrismaApprovalStatus,
} from "../../../../shared/infrastructure/persistence/prisma.client";
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
  const mapped = workflowStatusToPrisma[status];
  if (!mapped) {
    throw new Error(`Unknown domain WorkflowStatus: ${status}`);
  }
  return mapped;
}

export function fromDbWorkflowStatus(status: PrismaWorkflowStatus): WorkflowStatus {
  const mapped = prismaToWorkflowStatus[status];
  if (!mapped) {
    throw new Error(`Unknown Prisma WorkflowStatus: ${status}`);
  }
  return mapped;
}

export function toDbApprovalStatus(status: ApprovalStatus): PrismaApprovalStatus {
  const mapped = approvalStatusToPrisma[status];
  if (!mapped) {
    throw new Error(`Unknown domain ApprovalStatus: ${status}`);
  }
  return mapped;
}

export function fromDbApprovalStatus(status: PrismaApprovalStatus): ApprovalStatus {
  const mapped = prismaToApprovalStatus[status];
  if (!mapped) {
    throw new Error(`Unknown Prisma ApprovalStatus: ${status}`);
  }
  return mapped;
}
