import { describe, it, expect } from 'vitest';
import { ExpenseWorkflow } from '../domain/entities/expense-workflow.entity';
import { ApprovalChain } from '../domain/entities/approval-chain.entity';
import {
  ApprovalChainNotFoundError,
  WorkflowNotFoundError,
  WorkflowAlreadyCompletedError,
  InvalidApprovalTransitionError,
  DuplicateApproversInSequenceError,
  InvalidAmountRangeError,
  EmptyApproverSequenceError,
  SelfApprovalNotAllowedError,
  InvalidApprovalChainNameError,
  RejectionReasonRequiredError,
  ConcurrencyConflictError,
  InvalidStepNumberError,
} from '../domain/errors';
import { PureDomainError } from '../../../shared/errors/pure-domain-error';
import { APPROVAL_POLICY_EVENTS } from '../../../shared/events/approval-policy-events';
import { WorkflowId, ApprovalChainId, ApprovalStepId, ApprovalAmount } from '../domain/value-objects';
import { ApprovalStep } from '../domain/entities/approval-step.entity';
import { UserId } from '@core/domain/value-objects';

const validWorkspaceId = '11111111-1111-4111-a111-111111111111';
const validApprover1 = '22222222-2222-4222-a222-222222222222';
const validApprover2 = '33333333-3333-4333-a333-333333333333';
const validExpenseId = '44444444-4444-4444-a444-444444444444';
const validUserId = '55555555-5555-4555-a555-555555555555';
const validChainId = '66666666-6666-4666-a666-666666666666';

describe('Approval Workflow Domain Model & Invariants', () => {
  describe('PureDomainError Neutrality', () => {
    it('should NOT have a statusCode property on domain error instances', () => {
      const chainNotFound = new ApprovalChainNotFoundError('chain-123');
      const workflowNotFound = new WorkflowNotFoundError('exp-456');
      const selfApproval = new SelfApprovalNotAllowedError('usr-789');

      expect(chainNotFound).toBeInstanceOf(PureDomainError);
      expect(chainNotFound.code).toBe('APPROVAL_CHAIN_NOT_FOUND');
      expect((chainNotFound as any).statusCode).toBeUndefined();

      expect(workflowNotFound).toBeInstanceOf(PureDomainError);
      expect(workflowNotFound.code).toBe('WORKFLOW_NOT_FOUND');
      expect((workflowNotFound as any).statusCode).toBeUndefined();

      expect(selfApproval).toBeInstanceOf(PureDomainError);
      expect(selfApproval.code).toBe('SELF_APPROVAL_NOT_ALLOWED');
      expect((selfApproval as any).statusCode).toBeUndefined();
    });
  });

  describe('ApprovalChain Invariants', () => {
    it('should reject empty approver sequence', () => {
      expect(() =>
        ApprovalChain.create({
          workspaceId: validWorkspaceId,
          name: 'Executive Chain',
          requiresReceipt: true,
          approverSequence: [],
        })
      ).toThrow(EmptyApproverSequenceError);
    });

    it('should reject duplicate approvers in sequence', () => {
      expect(() =>
        ApprovalChain.create({
          workspaceId: validWorkspaceId,
          name: 'Executive Chain',
          requiresReceipt: true,
          approverSequence: [validApprover1, validApprover1],
        })
      ).toThrow(DuplicateApproversInSequenceError);
    });

    it('should reject minAmount > maxAmount', () => {
      expect(() =>
        ApprovalChain.create({
          workspaceId: validWorkspaceId,
          name: 'Executive Chain',
          minAmount: 500,
          maxAmount: 100,
          requiresReceipt: true,
          approverSequence: [validApprover1],
        })
      ).toThrow(InvalidAmountRangeError);
    });

    it('should emit APPROVAL_CHAIN_CREATED typed event upon creation', () => {
      const chain = ApprovalChain.create({
        workspaceId: validWorkspaceId,
        name: 'Executive Chain',
        minAmount: 100,
        maxAmount: 500,
        requiresReceipt: true,
        approverSequence: [validApprover1],
      });

      expect(chain.domainEvents).toHaveLength(1);
      expect(chain.domainEvents[0].eventType).toBe(
        APPROVAL_POLICY_EVENTS.APPROVAL_CHAIN_CREATED
      );
    });

    it('should reject empty or whitespace name upon creation', () => {
      expect(() =>
        ApprovalChain.create({
          workspaceId: validWorkspaceId,
          name: '   ',
          requiresReceipt: true,
          approverSequence: [validApprover1],
        })
      ).toThrow(InvalidApprovalChainNameError);
    });

    it('should reject name exceeding 100 characters', () => {
      expect(() =>
        ApprovalChain.create({
          workspaceId: validWorkspaceId,
          name: 'A'.repeat(101),
          requiresReceipt: true,
          approverSequence: [validApprover1],
        })
      ).toThrow(InvalidApprovalChainNameError);
    });

    it('should reject empty or invalid name on updateName', () => {
      const chain = ApprovalChain.create({
        workspaceId: validWorkspaceId,
        name: 'Standard Chain',
        requiresReceipt: true,
        approverSequence: [validApprover1],
      });

      expect(() => chain.updateName('')).toThrow(InvalidApprovalChainNameError);
      expect(() => chain.updateName('  ')).toThrow(InvalidApprovalChainNameError);
      expect(() => chain.updateName('X'.repeat(101))).toThrow(InvalidApprovalChainNameError);
    });

    it('should reject duplicate approvers when updating approver sequence', () => {
      const chain = ApprovalChain.create({
        workspaceId: validWorkspaceId,
        name: 'Standard Chain',
        requiresReceipt: true,
        approverSequence: [validApprover1],
      });

      expect(() =>
        chain.updateApproverSequence([validApprover1, validApprover1])
      ).toThrow(DuplicateApproversInSequenceError);

      expect(() => chain.updateApproverSequence([])).toThrow(EmptyApproverSequenceError);
    });

    it('should support equals and toDTO on ApprovalChain', () => {
      const chain1 = ApprovalChain.create({
        workspaceId: validWorkspaceId,
        name: 'Standard Chain',
        requiresReceipt: true,
        approverSequence: [validApprover1],
      });

      expect(chain1.equals(chain1)).toBe(true);

      const dto = chain1.toDTO();
      expect(dto.name).toBe('Standard Chain');
      expect(dto.workspaceId).toBe(validWorkspaceId.toLowerCase());
      expect(dto.approverSequence).toEqual([validApprover1.toLowerCase()]);
      expect(dto.isActive).toBe(true);
    });

    it('should reject invalid amount range when maxAmount is 0 (truthiness bug fix)', () => {
      expect(() =>
        ApprovalChain.create({
          workspaceId: validWorkspaceId,
          name: 'Zero Cap Chain',
          minAmount: 10,
          maxAmount: 0,
          requiresReceipt: true,
          approverSequence: [validApprover1],
        })
      ).toThrow(InvalidAmountRangeError);

      const chain = ApprovalChain.create({
        workspaceId: validWorkspaceId,
        name: 'Zero Cap Chain',
        requiresReceipt: true,
        approverSequence: [validApprover1],
      });

      expect(() => chain.updateAmountRange(10, 0)).toThrow(InvalidAmountRangeError);
    });

    it('should correctly match when maxAmount is 0 in appliesTo', () => {
      const chain = ApprovalChain.create({
        workspaceId: validWorkspaceId,
        name: 'Zero Max Chain',
        minAmount: 0,
        maxAmount: 0,
        requiresReceipt: false,
        approverSequence: [validApprover1],
      });

      expect(chain.appliesTo({ amount: 0, hasReceipt: false })).toBe(true);
      expect(chain.appliesTo({ amount: 0.01, hasReceipt: false })).toBe(false);
      expect(chain.appliesTo({ amount: 100, hasReceipt: false })).toBe(false);
    });

    it('should freeze approverSequence and categoryIds arrays from external mutation', () => {
      const chain = ApprovalChain.create({
        workspaceId: validWorkspaceId,
        name: 'Immutable Chain',
        requiresReceipt: true,
        approverSequence: [validApprover1],
      });

      expect(Object.isFrozen(chain.approverSequence)).toBe(true);
      expect(() => (chain.approverSequence as any).push('hacked')).toThrow();
    });

    it('should enforce MIN_APPROVAL_AMOUNT, MAX_APPROVAL_AMOUNT, and finite checks (Finding 3)', () => {
      // Negative amount rejected
      expect(() =>
        ApprovalChain.create({
          workspaceId: validWorkspaceId,
          name: 'Negative Chain',
          minAmount: -10,
          requiresReceipt: true,
          approverSequence: [validApprover1],
        })
      ).toThrow(InvalidAmountRangeError);

      // NaN rejected
      expect(() =>
        ApprovalChain.create({
          workspaceId: validWorkspaceId,
          name: 'NaN Chain',
          minAmount: NaN,
          requiresReceipt: true,
          approverSequence: [validApprover1],
        })
      ).toThrow(InvalidAmountRangeError);

      // Infinity rejected
      expect(() =>
        ApprovalChain.create({
          workspaceId: validWorkspaceId,
          name: 'Infinity Chain',
          minAmount: Infinity,
          requiresReceipt: true,
          approverSequence: [validApprover1],
        })
      ).toThrow(InvalidAmountRangeError);

      // Value exceeding MAX_APPROVAL_AMOUNT rejected
      expect(() =>
        ApprovalChain.create({
          workspaceId: validWorkspaceId,
          name: 'Exceeding Chain',
          minAmount: 1_000_000_000,
          requiresReceipt: true,
          approverSequence: [validApprover1],
        })
      ).toThrow(InvalidAmountRangeError);

      const chain = ApprovalChain.create({
        workspaceId: validWorkspaceId,
        name: 'Valid Chain',
        minAmount: 10,
        maxAmount: 100,
        requiresReceipt: true,
        approverSequence: [validApprover1],
      });

      // Updates also validate limits
      expect(() => chain.updateAmountRange(-5, 100)).toThrow(InvalidAmountRangeError);
      expect(() => chain.updateAmountRange(10, NaN)).toThrow(InvalidAmountRangeError);
      expect(() => chain.updateAmountRange(10, 1_000_000_000)).toThrow(InvalidAmountRangeError);
      expect(() => chain.updateAmountRange(Infinity, 100)).toThrow(InvalidAmountRangeError);
    });
  });

  describe('ExpenseWorkflow Invariants & Concurrency', () => {
    const validWorkflowData = {
      expenseId: validExpenseId,
      workspaceId: validWorkspaceId,
      userId: validUserId,
      chainId: validChainId,
      approverSequence: [validApprover1, validApprover2],
    };

    it('should initialize with status PENDING and emit WORKFLOW_STARTED only upon start() (Finding 5)', () => {
      const wf = ExpenseWorkflow.create(validWorkflowData);

      expect(wf.version).toBe(1);
      expect(wf.currentStepNumber).toBe(1);
      expect(wf.status).toBe('pending');
      expect(wf.steps).toHaveLength(2);
      expect(wf.domainEvents).toHaveLength(0);

      wf.start();
      expect(wf.status).toBe('in_progress');
      expect(wf.domainEvents).toHaveLength(1);
      expect(wf.domainEvents[0].eventType).toBe(
        APPROVAL_POLICY_EVENTS.WORKFLOW_STARTED
      );
    });

    it('should synchronize version correctly upon optimistic lock update', () => {
      const wf = ExpenseWorkflow.create(validWorkflowData);
      expect(wf.version).toBe(1);
      wf.synchronizeVersion(2);
      expect(wf.version).toBe(2);
    });

    it('should reject out-of-order step approval', () => {
      const wf = ExpenseWorkflow.create(validWorkflowData);
      wf.start();

      // Current step is 1; approving step 2 must fail
      expect(() => wf.processStepApproval(2)).toThrow(
        InvalidApprovalTransitionError
      );
    });

    it('should advance step number sequentially and complete when last step is approved', () => {
      const wf = ExpenseWorkflow.create(validWorkflowData);
      wf.start();

      // Step 1
      wf.approveCurrentStep('Step 1 ok');

      expect(wf.currentStepNumber).toBe(2);
      expect(wf.status).toBe('in_progress');

      // Step 2 (last step)
      wf.approveCurrentStep('Step 2 ok');

      expect(wf.status).toBe('approved');
      expect(wf.completedAt).toBeDefined();
      expect(wf.isCompleted()).toBe(true);
    });

    it('should reject any further transitions once workflow is completed', () => {
      const wf = ExpenseWorkflow.create(validWorkflowData);
      wf.start();

      // Reject step 1 via aggregate root
      wf.rejectCurrentStep('Exceeds budget');

      expect(wf.status).toBe('rejected');
      expect(wf.isCompleted()).toBe(true);

      // Attempting to cancel, auto-approve, start, or approve must throw WorkflowAlreadyCompletedError
      expect(() => wf.cancel(validUserId)).toThrow(WorkflowAlreadyCompletedError);
      expect(() => wf.autoApproveAll()).toThrow(WorkflowAlreadyCompletedError);
      expect(() => wf.start()).toThrow(WorkflowAlreadyCompletedError);
      expect(() => wf.processStepApproval(1)).toThrow(
        WorkflowAlreadyCompletedError
      );
      expect(() => wf.processStepRejection()).toThrow(
        WorkflowAlreadyCompletedError
      );
    });

    it('should reject empty approver sequence upon creation', () => {
      expect(() =>
        ExpenseWorkflow.create({
          ...validWorkflowData,
          approverSequence: [],
        })
      ).toThrow(EmptyApproverSequenceError);
    });

    it('should reject duplicate approvers upon creation', () => {
      expect(() =>
        ExpenseWorkflow.create({
          ...validWorkflowData,
          approverSequence: [validApprover1, validApprover1],
        })
      ).toThrow(DuplicateApproversInSequenceError);
    });

    it('should reject self-approval when requester is in approver sequence', () => {
      expect(() =>
        ExpenseWorkflow.create({
          ...validWorkflowData,
          userId: validApprover1,
          approverSequence: [validApprover1, validApprover2],
        })
      ).toThrow(SelfApprovalNotAllowedError);
    });

    it('should support equals and toDTO on ExpenseWorkflow', () => {
      const wf = ExpenseWorkflow.create(validWorkflowData);
      expect(wf.equals(wf)).toBe(true);

      const dto = wf.toDTO();
      expect(dto.workflowId).toBe(wf.id.getValue());
      expect(dto.expenseId).toBe(validExpenseId.toLowerCase());
      expect(dto.userId).toBe(validUserId.toLowerCase());
      expect(dto.status).toBe('pending');
      expect(dto.currentStepNumber).toBe(1);
      expect(dto.version).toBe(1);
      expect(dto.steps).toHaveLength(2);
      expect(dto.steps[0].stepNumber).toBe(1);
      expect(dto.steps[0].approverId).toBe(validApprover1.toLowerCase());
    });

    it('should support equals and toDTO on ApprovalStep entity', () => {
      const step1 = ApprovalStep.create({
        workflowId: validWorkspaceId,
        stepNumber: 1,
        approverId: validApprover1,
      });
      const step2 = ApprovalStep.create({
        workflowId: validWorkspaceId,
        stepNumber: 2,
        approverId: validApprover2,
      });

      expect(step1.equals(step1)).toBe(true);
      expect(step1.equals(step2)).toBe(false);

      const stepDTO = step1.toDTO();
      expect(stepDTO.stepNumber).toBe(1);
      expect(stepDTO.approverId).toBe(validApprover1.toLowerCase());
      expect(stepDTO.status).toBe('pending');
    });

    it('should seal child steps by exposing immutable DTO snapshots (Finding 1)', () => {
      const wf = ExpenseWorkflow.create(validWorkflowData);
      expect(Object.isFrozen(wf.steps)).toBe(true);
      expect(Object.isFrozen(wf.steps[0])).toBe(true);

      // Child entities cannot be mutated through the getter
      expect((wf.steps[0] as any).approve).toBeUndefined();
      expect((wf.steps[0] as any).reject).toBeUndefined();
      expect((wf.steps[0] as any).delegate).toBeUndefined();

      // Current step is also an immutable snapshot
      const currentStep = wf.getCurrentStep();
      expect(currentStep).toBeDefined();
      expect(Object.isFrozen(currentStep)).toBe(true);
      expect((currentStep as any).approve).toBeUndefined();
    });

    it('should attribute delegated step approval and completion events to delegated approver (Finding 1)', () => {
      const wf = ExpenseWorkflow.create(validWorkflowData);
      wf.start();

      // Step 1: delegate from validApprover1 to validApprover2
      wf.delegateCurrentStep(validApprover2);

      // Approve step 1 by the delegated approver (validApprover2) via aggregate root
      wf.approveCurrentStep('Approved by delegate');

      // Check event: decider must be validApprover2, not validApprover1
      const step1Event = wf.domainEvents.find(
        (e) =>
          e.eventType === APPROVAL_POLICY_EVENTS.WORKFLOW_STEP_COMPLETED &&
          (e.getPayload() as any).stepNumber === 1
      );
      expect(step1Event).toBeDefined();
      expect((step1Event!.getPayload() as any).approverId).toBe(
        validApprover2.toLowerCase()
      );

      // Step 2: final step, approve via aggregate root and verify finalApproverId
      wf.approveCurrentStep('Final step approved');

      const completedEvent = wf.domainEvents.find(
        (e) => e.eventType === APPROVAL_POLICY_EVENTS.WORKFLOW_COMPLETED
      );
      expect(completedEvent).toBeDefined();
      expect((completedEvent!.getPayload() as any).finalApproverId).toBe(
        validApprover2.toLowerCase()
      );
    });

    it('should attribute delegated step rejection events to delegated approver (Finding 1)', () => {
      const wf = ExpenseWorkflow.create(validWorkflowData);
      wf.start();

      // Delegate step 1
      wf.delegateCurrentStep(validApprover2);

      // Reject step 1 by the delegated approver via aggregate root
      wf.rejectCurrentStep('Rejected by delegate');

      const rejectionEvent = wf.domainEvents.find(
        (e) => e.eventType === APPROVAL_POLICY_EVENTS.WORKFLOW_REJECTED
      );
      expect(rejectionEvent).toBeDefined();
      expect((rejectionEvent!.getPayload() as any).rejectedBy).toBe(
        validApprover2.toLowerCase()
      );
    });

    it('should reject delegation to expense requester in delegateStep and delegateCurrentStep (Finding 1)', () => {
      const wf = ExpenseWorkflow.create(validWorkflowData);
      wf.start();

      // Attempt to delegate to the requester (validUserId) via delegateCurrentStep
      expect(() => wf.delegateCurrentStep(validUserId)).toThrow(
        SelfApprovalNotAllowedError
      );

      // Attempt to delegate to the requester (validUserId) via delegateStep
      expect(() => wf.delegateStep(1, validUserId)).toThrow(
        SelfApprovalNotAllowedError
      );

      // Delegating to an authorized non-requester user succeeds
      const thirdPartyApprover = '77777777-7777-4777-a777-777777777777';
      wf.delegateCurrentStep(thirdPartyApprover);
      expect(wf.steps[0].delegatedTo).toBe(thirdPartyApprover.toLowerCase());

      const delegatedEvent = wf.domainEvents.find(
        (e) => e.eventType === APPROVAL_POLICY_EVENTS.WORKFLOW_STEP_DELEGATED
      );
      expect(delegatedEvent).toBeDefined();
      expect((delegatedEvent!.getPayload() as any).toApproverId).toBe(
        thirdPartyApprover.toLowerCase()
      );
      expect((delegatedEvent!.getPayload() as any).fromApproverId).toBe(
        validApprover1.toLowerCase()
      );
    });

    it('should record actor and reason on workflow cancellation event (Finding 2)', () => {
      const wf = ExpenseWorkflow.create(validWorkflowData);
      wf.start();

      const cancelActor = '99999999-9999-4999-a999-999999999999';
      const cancelReason = 'Expense submitted in error';
      wf.cancel(cancelActor, cancelReason);

      expect(wf.status).toBe('cancelled');
      expect(wf.isCompleted()).toBe(true);

      const cancelledEvent = wf.domainEvents.find(
        (e) => e.eventType === APPROVAL_POLICY_EVENTS.WORKFLOW_CANCELLED
      );
      expect(cancelledEvent).toBeDefined();
      expect((cancelledEvent!.getPayload() as any).cancelledBy).toBe(cancelActor);
      expect((cancelledEvent!.getPayload() as any).reason).toBe(cancelReason);

      // Default reason falls back when omitted
      const wfDefault = ExpenseWorkflow.create(validWorkflowData);
      wfDefault.start();
      wfDefault.cancel(validUserId);

      const defaultCancelEvent = wfDefault.domainEvents.find(
        (e) => e.eventType === APPROVAL_POLICY_EVENTS.WORKFLOW_CANCELLED
      );
      expect(defaultCancelEvent).toBeDefined();
      expect((defaultCancelEvent!.getPayload() as any).cancelledBy).toBe(
        validUserId.toLowerCase()
      );
      expect((defaultCancelEvent!.getPayload() as any).reason).toBe(
        'Cancelled by user'
      );
    });

    it('should reject step approval, rejection, or delegation when workflow is still PENDING (Finding 2)', () => {
      const wf = ExpenseWorkflow.create(validWorkflowData);
      // Workflow is PENDING (start() has not been called)
      expect(wf.status).toBe('pending');

      expect(() => wf.approveCurrentStep('premature approval')).toThrow(
        InvalidApprovalTransitionError
      );
      expect(() => wf.rejectCurrentStep('premature rejection')).toThrow(
        InvalidApprovalTransitionError
      );
      expect(() => wf.delegateCurrentStep(validApprover2)).toThrow(
        InvalidApprovalTransitionError
      );
      expect(() => wf.delegateStep(1, validApprover2)).toThrow(
        InvalidApprovalTransitionError
      );
      expect(() => wf.processStepApproval(1)).toThrow(
        InvalidApprovalTransitionError
      );
      expect(() => wf.processStepRejection()).toThrow(
        InvalidApprovalTransitionError
      );
    });

    it('should reject processStepRejection when current step was not actually rejected (Finding 2)', () => {
      const wf = ExpenseWorkflow.create(validWorkflowData);
      wf.start();

      // Step 1 is still PENDING (currentStep was not rejected)
      expect(() => wf.processStepRejection()).toThrow(
        InvalidApprovalTransitionError
      );
    });

    it('should enforce version validation and prevent rollback and version jumps in synchronizeVersion (Finding 4)', () => {
      const wf = ExpenseWorkflow.create(validWorkflowData);
      expect(wf.version).toBe(1);

      expect(() => wf.synchronizeVersion(0)).toThrow(ConcurrencyConflictError);
      expect(() => wf.synchronizeVersion(-5)).toThrow(ConcurrencyConflictError);
      expect(() => wf.synchronizeVersion(1.5)).toThrow(ConcurrencyConflictError);
      expect(() => wf.synchronizeVersion(1)).toThrow(ConcurrencyConflictError); // same version rejected
      expect(() => wf.synchronizeVersion(3)).toThrow(ConcurrencyConflictError); // version jump (1 -> 3) rejected
      expect(() => wf.synchronizeVersion(100)).toThrow(ConcurrencyConflictError); // large jump rejected

      wf.synchronizeVersion(2);
      expect(wf.version).toBe(2);

      // Rollback and jumps rejected
      expect(() => wf.synchronizeVersion(1)).toThrow(ConcurrencyConflictError);
      expect(() => wf.synchronizeVersion(2)).toThrow(ConcurrencyConflictError);
      expect(() => wf.synchronizeVersion(4)).toThrow(ConcurrencyConflictError); // jump from 2 -> 4 rejected

      wf.synchronizeVersion(3);
      expect(wf.version).toBe(3);
    });

    it('should freeze steps array and support aggregate root operations', () => {
      const wf = ExpenseWorkflow.create(validWorkflowData);
      expect(Object.isFrozen(wf.steps)).toBe(true);
      expect(() => (wf.steps as any).push(wf.steps[0])).toThrow();

      wf.start();
      wf.approveCurrentStep('Approved via aggregate root');
      expect(wf.currentStepNumber).toBe(2);
      expect(wf.steps[0].status).toBe('approved');
    });

    it('should reject whitespace-only rejection comments in ApprovalStep and aggregate (Finding 6)', () => {
      const step = ApprovalStep.create({
        workflowId: validWorkspaceId,
        stepNumber: 1,
        approverId: validApprover1,
      });
      expect(() => step.reject('   ')).toThrow(RejectionReasonRequiredError);
      expect(() => step.reject('')).toThrow(RejectionReasonRequiredError);

      const wf = ExpenseWorkflow.create(validWorkflowData);
      wf.start();

      expect(() => wf.rejectCurrentStep('   ')).toThrow(
        RejectionReasonRequiredError
      );
      expect(() => wf.rejectCurrentStep('')).toThrow(
        RejectionReasonRequiredError
      );

      wf.rejectCurrentStep('Legitimate reason');
      expect(wf.status).toBe('rejected');
      expect(wf.steps[0].comments).toBe('Legitimate reason');
    });

    it('should validate positive integer step numbers on ApprovalStep.create and fromPersistence', () => {
      const baseData = {
        workflowId: validWorkspaceId,
        approverId: validApprover1,
      };

      // Rejects zero
      expect(() => ApprovalStep.create({ ...baseData, stepNumber: 0 })).toThrow(
        InvalidStepNumberError
      );

      // Rejects negative
      expect(() => ApprovalStep.create({ ...baseData, stepNumber: -1 })).toThrow(
        InvalidStepNumberError
      );

      // Rejects fractions
      expect(() => ApprovalStep.create({ ...baseData, stepNumber: 1.5 })).toThrow(
        InvalidStepNumberError
      );

      // Rejects NaN
      expect(() => ApprovalStep.create({ ...baseData, stepNumber: NaN })).toThrow(
        InvalidStepNumberError
      );

      // Accepts positive integer
      const step = ApprovalStep.create({ ...baseData, stepNumber: 1 });
      expect(step.stepNumber).toBe(1);

      // fromPersistence also enforces the invariant
      expect(() =>
        ApprovalStep.fromPersistence({
          stepId: ApprovalStepId.create(),
          workflowId: WorkflowId.fromString(validWorkspaceId),
          stepNumber: 0,
          approverId: UserId.fromString(validApprover1),
          status: 'PENDING' as any,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ).toThrow(InvalidStepNumberError);
    });

    it('should defensively clone Date references in ApprovalStep toSnapshot and getters', () => {
      const step = ApprovalStep.create({
        workflowId: validWorkspaceId,
        stepNumber: 1,
        approverId: validApprover1,
      });

      const snapshot = step.toSnapshot();
      const originalTime = snapshot.createdAt.getTime();

      // Mutating snapshot's Date instance must not alter internal entity date
      snapshot.createdAt.setTime(0);
      expect(step.createdAt.getTime()).toBe(originalTime);

      // A fresh snapshot retains the original time
      const freshSnapshot = step.toSnapshot();
      expect(freshSnapshot.createdAt.getTime()).toBe(originalTime);

      // Mutating entity getter Date must not alter internal state
      const getterDate = step.createdAt;
      getterDate.setTime(0);
      expect(step.createdAt.getTime()).toBe(originalTime);
    });

    it('should defensively clone Date references in ExpenseWorkflow and ApprovalChain getters', () => {
      const wf = ExpenseWorkflow.create(validWorkflowData);
      const originalWfTime = wf.createdAt.getTime();
      wf.createdAt.setTime(0);
      expect(wf.createdAt.getTime()).toBe(originalWfTime);

      const chain = ApprovalChain.create({
        workspaceId: validWorkspaceId,
        name: 'Standard Chain',
        requiresReceipt: true,
        approverSequence: [validApprover1],
      });
      const originalChainTime = chain.createdAt.getTime();
      chain.createdAt.setTime(0);
      expect(chain.createdAt.getTime()).toBe(originalChainTime);
    });
  });

  describe('Value Objects Invariants & Canonicalization', () => {
    it('should canonicalize UUIDs to lowercase upon construction', () => {
      const upperId = validWorkspaceId.toUpperCase();
      const wfId = WorkflowId.fromString(upperId);
      expect(wfId.getValue()).toBe(validWorkspaceId.toLowerCase());
      expect(wfId.toString()).toBe(validWorkspaceId.toLowerCase());
      expect(wfId.toJSON()).toBe(validWorkspaceId.toLowerCase());

      const lowerId = WorkflowId.fromString(validWorkspaceId.toLowerCase());
      expect(wfId.equals(lowerId)).toBe(true);
    });

    it('should reject cross-type equality even with identical UUID values', () => {
      const chainId = ApprovalChainId.fromString(validChainId);
      const wfId = WorkflowId.fromString(validChainId);
      const stepId = ApprovalStepId.fromString(validChainId);

      expect(chainId.equals(wfId as any)).toBe(false);
      expect(wfId.equals(chainId as any)).toBe(false);
      expect(stepId.equals(wfId as any)).toBe(false);
    });
  });

  describe('ApprovalAmount Value Object & Monetary Invariants (Finding 4)', () => {
    it('should create valid ApprovalAmount and round to 2 decimal places', () => {
      const amount1 = ApprovalAmount.fromNumber(100.555);
      expect(amount1.getValue()).toBe(100.56);
      expect(amount1.toString()).toBe('100.56');
      expect(amount1.toJSON()).toBe(100.56);

      const amount2 = ApprovalAmount.fromNumber(0);
      expect(amount2.getValue()).toBe(0);

      const amount3 = ApprovalAmount.fromNumber(999999999.99);
      expect(amount3.getValue()).toBe(999999999.99);
    });

    it('should reject invalid amount numbers', () => {
      expect(() => ApprovalAmount.fromNumber(-0.01)).toThrow(InvalidAmountRangeError);
      expect(() => ApprovalAmount.fromNumber(NaN)).toThrow(InvalidAmountRangeError);
      expect(() => ApprovalAmount.fromNumber(Infinity)).toThrow(InvalidAmountRangeError);
      expect(() => ApprovalAmount.fromNumber(-Infinity)).toThrow(InvalidAmountRangeError);
      expect(() => ApprovalAmount.fromNumber(1000000000)).toThrow(InvalidAmountRangeError);
      expect(() => ApprovalAmount.fromNumber('100' as any)).toThrow(InvalidAmountRangeError);
    });

    it('should support equals, isLessThan, and isGreaterThan', () => {
      const a = ApprovalAmount.fromNumber(50);
      const b = ApprovalAmount.fromNumber(50);
      const c = ApprovalAmount.fromNumber(100);

      expect(a.equals(b)).toBe(true);
      expect(a.equals(c)).toBe(false);
      expect(a.isLessThan(c)).toBe(true);
      expect(c.isGreaterThan(a)).toBe(true);
      expect(a.isLessThan(b)).toBe(false);
      expect(a.isGreaterThan(b)).toBe(false);
    });

    it('should reject NaN or negative amounts in ApprovalChain appliesTo', () => {
      const chain = ApprovalChain.create({
        workspaceId: validWorkspaceId,
        name: 'Finance Chain',
        minAmount: 100,
        maxAmount: 500,
        requiresReceipt: true,
        approverSequence: [validApprover1],
      });

      expect(() => chain.appliesTo({ amount: NaN, hasReceipt: true })).toThrow(
        InvalidAmountRangeError
      );
      expect(() => chain.appliesTo({ amount: -50, hasReceipt: true })).toThrow(
        InvalidAmountRangeError
      );
      expect(() => chain.appliesTo({ amount: Infinity, hasReceipt: true })).toThrow(
        InvalidAmountRangeError
      );

      expect(chain.appliesTo({ amount: 250, hasReceipt: true })).toBe(true);
      expect(chain.appliesTo({ amount: 50, hasReceipt: true })).toBe(false);
      expect(chain.appliesTo({ amount: 600, hasReceipt: true })).toBe(false);
    });
  });
});

