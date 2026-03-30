// Own value objects
export { ApprovalChainId } from './approval-chain-id';
export { ApprovalStepId } from './approval-step-id';
export { WorkflowId } from './workflow-id';

// Cross-module shared VOs — imported from module public APIs (sealed index.ts boundaries)
export { UserId, WorkspaceId } from '../../../identity-workspace';
export { ExpenseId, CategoryId } from '../../../expense-ledger';
