import { describe, it, expect, vi } from 'vitest';
import { FastifyReply } from 'fastify';
import { ResponseHelper } from '../../../shared/response.helper';
import {
  ApprovalWorkflowDomainError,
  ApprovalChainNotFoundError,
  ApprovalStepNotFoundError,
  InvalidApprovalTransitionError,
  UnauthorizedApproverError,
  ApprovalAlreadyProcessedError,
  InvalidDelegationError,
  WorkflowNotFoundError,
  WorkflowAlreadyExistsError,
  NoMatchingApprovalChainError,
  SelfApprovalNotAllowedError,
  WorkflowAlreadyCompletedError,
  WorkflowStepNotFoundError,
  InvalidStepNumberError,
  CurrentStepNotFoundError,
  RejectionReasonRequiredError,
  EmptyApproverSequenceError,
  MaxApproversExceededError,
  DuplicateApproversInSequenceError,
  InvalidAmountRangeError,
  InvalidApprovalChainNameError,
  ApprovalChainDescriptionTooLongError,
  ApprovalCommentTooLongError,
  ConcurrencyConflictError,
  UnauthorizedWorkflowCancellationError,
  UnauthorizedWorkflowViewError,
  WorkflowStepMismatchError,
  ApprovalChainInUseError,
} from '../domain/errors';
import { PureDomainError } from '../../../shared/errors/pure-domain-error';
import {
  mapDomainCodeToHttpStatus,
  resolveHttpStatus,
} from '../../../shared/errors/error-http-mapper';
import {
  ApprovalStatus,
  WorkflowStatus,
} from '../domain/enums';
import { APPROVAL_POLICY_EVENTS } from '../../../shared/events/approval-policy-events';
import { buildWebhookRoutes } from '../../../shared/infrastructure/webhooks/webhook-routing';
import {
  toDbWorkflowStatus,
  fromDbWorkflowStatus,
  toDbApprovalStatus,
  fromDbApprovalStatus,
} from '../infrastructure/persistence/enum-mappers';
import {
  APPROVAL_CHAIN_NAME_MIN_LENGTH,
  APPROVAL_CHAIN_NAME_MAX_LENGTH,
  APPROVAL_CHAIN_DESCRIPTION_MAX_LENGTH,
  MIN_APPROVERS,
  MAX_APPROVERS,
  MIN_APPROVAL_AMOUNT,
  MAX_APPROVAL_AMOUNT,
  AUTO_APPROVAL_THRESHOLD,
  APPROVAL_COMMENTS_MAX_LENGTH,
  REJECTION_COMMENTS_MIN_LENGTH,
  REJECTION_COMMENTS_MAX_LENGTH,
  INITIAL_STEP_NUMBER,
  INITIAL_WORKFLOW_VERSION,
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
  MIN_PAGE_OFFSET,
  AGGREGATE_TYPE_APPROVAL_CHAIN,
  AGGREGATE_TYPE_EXPENSE_WORKFLOW,
} from '../domain/constants';
import { ApprovalChain } from '../domain/entities/approval-chain.entity';
import { ApprovalStep } from '../domain/entities/approval-step.entity';
import { ExpenseWorkflow } from '../domain/entities/expense-workflow.entity';

describe('Errors, Enums, and Constants Unit Tests', () => {
  const validWorkspaceId = '11111111-1111-4111-a111-111111111111';
  const validApprover1 = '22222222-2222-4222-a222-222222222222';
  const validApprover2 = '33333333-3333-4333-a333-333333333333';
  const validExpenseId = '44444444-4444-4444-a444-444444444444';
  const validUserId = '55555555-5555-4555-a555-555555555555';

  // ==========================================================================
  // 1. CONSTANTS VERIFICATION
  // ==========================================================================
  describe('Constants Definitions & Boundaries', () => {
    it('should define expected approval chain constraints', () => {
      expect(APPROVAL_CHAIN_NAME_MIN_LENGTH).toBe(1);
      expect(APPROVAL_CHAIN_NAME_MAX_LENGTH).toBe(100);
      expect(APPROVAL_CHAIN_DESCRIPTION_MAX_LENGTH).toBe(500);
      expect(MIN_APPROVERS).toBe(1);
      expect(MAX_APPROVERS).toBe(10);
      expect(MIN_APPROVAL_AMOUNT).toBe(0);
      expect(MAX_APPROVAL_AMOUNT).toBe(999999999.99);
      expect(AUTO_APPROVAL_THRESHOLD).toBe(50);
    });

    it('should define expected comment constraints', () => {
      expect(APPROVAL_COMMENTS_MAX_LENGTH).toBe(1000);
      expect(REJECTION_COMMENTS_MIN_LENGTH).toBe(1);
      expect(REJECTION_COMMENTS_MAX_LENGTH).toBe(1000);
    });

    it('should define expected workflow state and pagination constants', () => {
      expect(INITIAL_STEP_NUMBER).toBe(1);
      expect(INITIAL_WORKFLOW_VERSION).toBe(1);
      expect(DEFAULT_PAGE_LIMIT).toBe(50);
      expect(MAX_PAGE_LIMIT).toBe(100);
      expect(MIN_PAGE_OFFSET).toBe(0);
      expect(AGGREGATE_TYPE_APPROVAL_CHAIN).toBe('ApprovalChain');
      expect(AGGREGATE_TYPE_EXPENSE_WORKFLOW).toBe('ExpenseWorkflow');
    });
  });

  // ==========================================================================
  // 2. ENUMS & ENUM MAPPERS
  // ==========================================================================
  describe('Enums & Enum Mappers', () => {
    it('should define ApprovalStatus with lowercase database-mapped values', () => {
      expect(ApprovalStatus.PENDING).toBe('pending');
      expect(ApprovalStatus.APPROVED).toBe('approved');
      expect(ApprovalStatus.REJECTED).toBe('rejected');
      expect(ApprovalStatus.DELEGATED).toBe('delegated');
      expect(ApprovalStatus.AUTO_APPROVED).toBe('auto_approved');
    });

    it('should define WorkflowStatus with lowercase database-mapped values', () => {
      expect(WorkflowStatus.PENDING).toBe('pending');
      expect(WorkflowStatus.IN_PROGRESS).toBe('in_progress');
      expect(WorkflowStatus.APPROVED).toBe('approved');
      expect(WorkflowStatus.REJECTED).toBe('rejected');
      expect(WorkflowStatus.CANCELLED).toBe('cancelled');
    });

    it('should map WorkflowStatus bi-directionally to and from Prisma', () => {
      const statuses = [
        WorkflowStatus.PENDING,
        WorkflowStatus.IN_PROGRESS,
        WorkflowStatus.APPROVED,
        WorkflowStatus.REJECTED,
        WorkflowStatus.CANCELLED,
      ];

      for (const status of statuses) {
        const dbStatus = toDbWorkflowStatus(status);
        expect(fromDbWorkflowStatus(dbStatus)).toBe(status);
      }
    });

    it('should map ApprovalStatus bi-directionally to and from Prisma', () => {
      const statuses = [
        ApprovalStatus.PENDING,
        ApprovalStatus.APPROVED,
        ApprovalStatus.REJECTED,
        ApprovalStatus.DELEGATED,
        ApprovalStatus.AUTO_APPROVED,
      ];

      for (const status of statuses) {
        const dbStatus = toDbApprovalStatus(status);
        expect(fromDbApprovalStatus(dbStatus)).toBe(status);
      }
    });

    it('should throw when mapping unknown Prisma WorkflowStatus', () => {
      expect(() => fromDbWorkflowStatus('UNKNOWN_STATUS' as any)).toThrow(
        /Unknown Prisma WorkflowStatus/
      );
    });

    it('should throw when mapping unknown domain WorkflowStatus', () => {
      expect(() => toDbWorkflowStatus('unknown_domain' as any)).toThrow(
        /Unknown domain WorkflowStatus/
      );
    });

    it('should throw when mapping unknown Prisma ApprovalStatus', () => {
      expect(() => fromDbApprovalStatus('UNKNOWN_STATUS' as any)).toThrow(
        /Unknown Prisma ApprovalStatus/
      );
    });

    it('should throw when mapping unknown domain ApprovalStatus', () => {
      expect(() => toDbApprovalStatus('unknown_domain' as any)).toThrow(
        /Unknown domain ApprovalStatus/
      );
    });
  });

  // ==========================================================================
  // 3. DOMAIN ERRORS & HTTP RESOLUTION
  // ==========================================================================
  describe('Domain Errors Purity & HTTP Mapping', () => {
    const errorInstances: { error: ApprovalWorkflowDomainError; expectedHttp: number }[] = [
      { error: new ApprovalChainNotFoundError('chain-1'), expectedHttp: 404 },
      { error: new ApprovalStepNotFoundError('step-1'), expectedHttp: 404 },
      { error: new WorkflowNotFoundError('exp-1'), expectedHttp: 404 },
      { error: new WorkflowStepNotFoundError(2), expectedHttp: 404 },
      { error: new CurrentStepNotFoundError('exp-1'), expectedHttp: 404 },

      { error: new UnauthorizedApproverError('usr-1', 'step-1'), expectedHttp: 403 },
      { error: new SelfApprovalNotAllowedError('usr-1'), expectedHttp: 403 },
      { error: new UnauthorizedWorkflowCancellationError('usr-1', 'exp-1'), expectedHttp: 403 },
      { error: new UnauthorizedWorkflowViewError('usr-1', 'exp-1'), expectedHttp: 403 },

      { error: new WorkflowAlreadyExistsError('exp-1'), expectedHttp: 409 },
      { error: new ApprovalAlreadyProcessedError('step-1'), expectedHttp: 409 },
      { error: new WorkflowAlreadyCompletedError('exp-1', 'approved'), expectedHttp: 409 },
      { error: new WorkflowStepMismatchError(1, 2), expectedHttp: 409 },
      { error: new ApprovalChainInUseError('chain-1'), expectedHttp: 409 },
      { error: new ConcurrencyConflictError('wf-1'), expectedHttp: 409 },

      { error: new InvalidApprovalTransitionError('pending', 'approved'), expectedHttp: 400 },
      { error: new InvalidDelegationError('Cannot delegate to self'), expectedHttp: 400 },
      { error: new NoMatchingApprovalChainError(validWorkspaceId, 100), expectedHttp: 400 },
      { error: new RejectionReasonRequiredError(), expectedHttp: 400 },
      { error: new EmptyApproverSequenceError(), expectedHttp: 400 },
      { error: new MaxApproversExceededError(10), expectedHttp: 400 },
      { error: new DuplicateApproversInSequenceError(), expectedHttp: 400 },
      { error: new InvalidAmountRangeError(), expectedHttp: 400 },
      { error: new InvalidApprovalChainNameError(), expectedHttp: 400 },
      { error: new InvalidStepNumberError(-1), expectedHttp: 400 },
      { error: new ApprovalChainDescriptionTooLongError(500), expectedHttp: 400 },
      { error: new ApprovalCommentTooLongError(1000), expectedHttp: 400 },
    ];

    it('should verify all domain errors inherit from PureDomainError without statusCode leakage', () => {
      for (const { error } of errorInstances) {
        expect(error).toBeInstanceOf(PureDomainError);
        expect(error).toBeInstanceOf(ApprovalWorkflowDomainError);
        expect(typeof error.code).toBe('string');
        expect(error.code).toMatch(/^[A-Z0-9_]+$/);
        expect(error.message.length).toBeGreaterThan(0);
        expect((error as any).statusCode).toBeUndefined();
      }
    });

    it('should map every domain error code to its designated HTTP status code', () => {
      for (const { error, expectedHttp } of errorInstances) {
        expect(mapDomainCodeToHttpStatus(error.code)).toBe(expectedHttp);
        expect(resolveHttpStatus(error)).toBe(expectedHttp);
      }
    });

    it('should map INVALID_UUID_FORMAT to 400 Bad Request', () => {
      expect(mapDomainCodeToHttpStatus('INVALID_UUID_FORMAT')).toBe(400);
    });

    it('should return 500 for unmapped code in mapDomainCodeToHttpStatus', () => {
      expect(mapDomainCodeToHttpStatus('COMPLETELY_UNKNOWN_CODE')).toBe(500);
      expect(mapDomainCodeToHttpStatus(undefined)).toBe(500);
    });
  });

  // ==========================================================================
  // 4. INVARIANT ENFORCEMENT VIA CONSTANTS
  // ==========================================================================
  describe('Invariant Enforcement via Constants', () => {
    it('should throw ApprovalChainDescriptionTooLongError when chain description exceeds max length on create', () => {
      const longDescription = 'a'.repeat(APPROVAL_CHAIN_DESCRIPTION_MAX_LENGTH + 1);
      expect(() =>
        ApprovalChain.create({
          workspaceId: validWorkspaceId,
          name: 'Valid Name',
          description: longDescription,
          approverSequence: [validApprover1],
          requiresReceipt: false,
        })
      ).toThrow(ApprovalChainDescriptionTooLongError);
    });

    it('should throw ApprovalChainDescriptionTooLongError when updating description exceeds max length', () => {
      const chain = ApprovalChain.create({
        workspaceId: validWorkspaceId,
        name: 'Valid Name',
        description: 'Short description',
        approverSequence: [validApprover1],
        requiresReceipt: false,
      });

      const longDescription = 'b'.repeat(APPROVAL_CHAIN_DESCRIPTION_MAX_LENGTH + 1);
      expect(() => chain.updateDescription(longDescription)).toThrow(
        ApprovalChainDescriptionTooLongError
      );
    });

    it('should throw MaxApproversExceededError when approver sequence exceeds MAX_APPROVERS on create', () => {
      const elevenApprovers = Array.from(
        { length: MAX_APPROVERS + 1 },
        (_, i) => `00000000-0000-4000-a000-${String(i).padStart(12, '0')}`
      );

      expect(() =>
        ApprovalChain.create({
          workspaceId: validWorkspaceId,
          name: 'Valid Name',
          approverSequence: elevenApprovers,
          requiresReceipt: false,
        })
      ).toThrow(MaxApproversExceededError);
    });

    it('should throw MaxApproversExceededError when updating approver sequence beyond MAX_APPROVERS', () => {
      const chain = ApprovalChain.create({
        workspaceId: validWorkspaceId,
        name: 'Valid Name',
        approverSequence: [validApprover1],
        requiresReceipt: false,
      });

      const elevenApprovers = Array.from(
        { length: MAX_APPROVERS + 1 },
        (_, i) => `00000000-0000-4000-a000-${String(i).padStart(12, '0')}`
      );

      expect(() => chain.updateApproverSequence(elevenApprovers)).toThrow(
        MaxApproversExceededError
      );
    });

    it('should throw MaxApproversExceededError in ExpenseWorkflow when approvers exceed MAX_APPROVERS', () => {
      const elevenApprovers = Array.from(
        { length: MAX_APPROVERS + 1 },
        (_, i) => `00000000-0000-4000-a000-${String(i).padStart(12, '0')}`
      );

      expect(() =>
        ExpenseWorkflow.create({
          expenseId: validExpenseId,
          workspaceId: validWorkspaceId,
          userId: validUserId,
          chainId: '99999999-9999-4999-a999-999999999999',
          approverSequence: elevenApprovers,
        })
      ).toThrow(MaxApproversExceededError);
    });

    it('should throw ApprovalCommentTooLongError when approval comments exceed max length', () => {
      const step = ApprovalStep.create({
        workflowId: '88888888-8888-4888-a888-888888888888',
        stepNumber: 1,
        approverId: validApprover1,
      });

      const longComment = 'c'.repeat(APPROVAL_COMMENTS_MAX_LENGTH + 1);
      expect(() => step.approve(longComment)).toThrow(ApprovalCommentTooLongError);
    });

    it('should throw ApprovalCommentTooLongError when rejection comments exceed max length', () => {
      const step = ApprovalStep.create({
        workflowId: '88888888-8888-4888-a888-888888888888',
        stepNumber: 1,
        approverId: validApprover1,
      });

      const longComment = 'd'.repeat(REJECTION_COMMENTS_MAX_LENGTH + 1);
      expect(() => step.reject(longComment)).toThrow(ApprovalCommentTooLongError);
    });

    it('should initialize ExpenseWorkflow with INITIAL_STEP_NUMBER and INITIAL_WORKFLOW_VERSION', () => {
      const workflow = ExpenseWorkflow.create({
        expenseId: validExpenseId,
        workspaceId: validWorkspaceId,
        userId: validUserId,
        chainId: '99999999-9999-4999-a999-999999999999',
        approverSequence: [validApprover1, validApprover2],
      });

      expect(workflow.currentStepNumber).toBe(INITIAL_STEP_NUMBER);
      expect(workflow.version).toBe(INITIAL_WORKFLOW_VERSION);
    });
  });

  // ==========================================================================
  // 5. DOMAIN EVENTS & INFRASTRUCTURE WEBHOOK ROUTING (Finding 3)
  // ==========================================================================
  describe('Domain Events & Webhook Routing Infrastructure (Finding 3)', () => {
    it('should use standardized event names while retaining backward-compatible aliases', () => {
      expect(APPROVAL_POLICY_EVENTS.WORKFLOW_STEP_DELEGATED).toBe('approval.step_delegated');
      expect(APPROVAL_POLICY_EVENTS.WORKFLOW_STEP_DELEGATED_LEGACY).toBe('approval_step.delegated');
      expect(APPROVAL_POLICY_EVENTS.WORKFLOW_CANCELLED).toBe('approval.workflow_cancelled');
    });

    it('should decouple domain events from webhook infrastructure and route events properly', () => {
      const routes = buildWebhookRoutes({
        auditServiceUrl: 'http://audit-service:3000',
        notificationServiceUrl: 'http://notification-service:3001',
      });

      // Chain events route to audit only
      expect(routes[APPROVAL_POLICY_EVENTS.APPROVAL_CHAIN_CREATED]).toEqual([
        'http://audit-service:3000/api/v1/event-outbox/events',
      ]);

      // Workflow events route to both audit and notification
      expect(routes[APPROVAL_POLICY_EVENTS.WORKFLOW_STEP_DELEGATED]).toEqual([
        'http://audit-service:3000/api/v1/event-outbox/events',
        'http://notification-service:3001/api/v1/event-outbox/events',
      ]);

      expect(routes[APPROVAL_POLICY_EVENTS.WORKFLOW_CANCELLED]).toEqual([
        'http://audit-service:3000/api/v1/event-outbox/events',
        'http://notification-service:3001/api/v1/event-outbox/events',
      ]);
    });
  });

  // ==========================================================================
  // 6. RESPONSE HELPER ERROR SANITIZATION & POLICY
  // ==========================================================================
  describe('ResponseHelper - Error Sanitization Policy', () => {
    it('should sanitize 500 error messages when in production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        const reply = {
          status: vi.fn().mockReturnThis(),
          send: vi.fn().mockReturnThis(),
        } as unknown as FastifyReply;

        ResponseHelper.error(reply, new Error('Sensitive database connection string postgres://...'));

        expect(reply.status).toHaveBeenCalledWith(500);
        expect(reply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'An unexpected error occurred',
          })
        );
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should sanitize explicit 500 errors carrying statusCode: 500 in production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        const reply = {
          status: vi.fn().mockReturnThis(),
          send: vi.fn().mockReturnThis(),
        } as unknown as FastifyReply;

        const explicitError = Object.assign(
          new Error('Sensitive database credentials exposed in query string'),
          { statusCode: 500 }
        );

        ResponseHelper.error(reply, explicitError);

        expect(reply.status).toHaveBeenCalledWith(500);
        expect(reply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'An unexpected error occurred',
          })
        );
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should reveal error message in development environment', () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'development';
        const reply = {
          status: vi.fn().mockReturnThis(),
          send: vi.fn().mockReturnThis(),
        } as unknown as FastifyReply;

        ResponseHelper.error(reply, new Error('Detailed debug message'));

        expect(reply.status).toHaveBeenCalledWith(500);
        expect(reply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            statusCode: 500,
            message: 'Detailed debug message',
          })
        );
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should map domain errors to their status code without obscuring client message', () => {
      const reply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
      } as unknown as FastifyReply;

      const domainError = new WorkflowNotFoundError('123');
      ResponseHelper.error(reply, domainError);

      expect(reply.status).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          statusCode: 404,
          error: 'Not Found',
          message: domainError.message,
        })
      );
    });
  });
});

