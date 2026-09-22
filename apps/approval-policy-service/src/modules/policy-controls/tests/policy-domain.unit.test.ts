import { describe, it, expect, vi } from 'vitest';
import {
  ExpensePolicy,
  PolicyScope,
  PolicyUpdatedEvent,
} from '../domain/entities/expense-policy.entity';
import {
  PolicyViolation,
} from '../domain/entities/policy-violation.entity';
import {
  PolicyExemption,
} from '../domain/entities/policy-exemption.entity';
import { PolicyType } from '../domain/enums/policy-type.enum';
import { ViolationSeverity } from '../domain/enums/violation-severity.enum';
import { ViolationStatus } from '../domain/enums/violation-status.enum';
import { ExemptionStatus } from '../domain/enums/exemption-status.enum';
import {
  PolicyNotFoundError,
  ViolationNotFoundError,
  ExemptionNotFoundError,
  InvalidThresholdError,
  InvalidPolicyConfigurationError,
  InvalidPriorityError,
  InvalidScopeError,
  ExemptionDurationExceededError,
  ExemptionReasonLengthError,
  ExemptionExpiredError,
  ViolationNoteLengthError,
  ViolationAlreadyResolvedError,
  PolicyEvaluationError,
  UnauthorizedExemptionApprovalError,
  InvalidExemptionForViolationError,
} from '../domain/errors/policy-controls.errors';
import { PureDomainError } from '../../../shared/errors/pure-domain-error';
import { APPROVAL_POLICY_EVENTS } from '../../../shared/events/approval-policy-events';
import { PolicyEvaluationService } from '../application/services/policy-evaluation.service';
import { ExemptionService } from '../application/services/exemption.service';
import { ExpireExemptionsHandler } from '../application/commands/expire-exemptions.command';

const validWorkspaceId = '11111111-1111-4111-a111-111111111111';
const validPolicyId = '22222222-2222-4222-a222-222222222222';
const validUserId = '33333333-3333-4333-a333-333333333333';
const validAdminId = '55555555-5555-4555-a555-555555555555';
const validExpenseId = '44444444-4444-4444-a444-444444444444';
const validCategoryId1 = '66666666-6666-4666-a666-666666666666';
const validCategoryId2 = '77777777-7777-4777-a777-777777777777';
const validExemptionId = '88888888-8888-4888-a888-888888888888';

describe('Policy Controls Domain Model & Invariants', () => {
  describe('PureDomainError Neutrality', () => {
    it('should NOT have a statusCode property on policy domain errors', () => {
      const policyNotFound = new PolicyNotFoundError('pol-1');
      const violationNotFound = new ViolationNotFoundError('viol-2');
      const exemptionNotFound = new ExemptionNotFoundError('ex-3');
      const invalidPriority = new InvalidPriorityError('invalid priority');

      expect(policyNotFound).toBeInstanceOf(PureDomainError);
      expect(policyNotFound.code).toBe('POLICY_NOT_FOUND');
      expect((policyNotFound as any).statusCode).toBeUndefined();

      expect(violationNotFound).toBeInstanceOf(PureDomainError);
      expect(violationNotFound.code).toBe('VIOLATION_NOT_FOUND');
      expect((violationNotFound as any).statusCode).toBeUndefined();

      expect(exemptionNotFound).toBeInstanceOf(PureDomainError);
      expect(exemptionNotFound.code).toBe('EXEMPTION_NOT_FOUND');
      expect((exemptionNotFound as any).statusCode).toBeUndefined();

      expect(invalidPriority).toBeInstanceOf(PureDomainError);
      expect(invalidPriority.code).toBe('INVALID_PRIORITY');
      expect((invalidPriority as any).statusCode).toBeUndefined();
    });
  });

  describe('Strict Identifier Validation', () => {
    it('should reject non-UUID createdBy in ExpensePolicy', () => {
      expect(() =>
        ExpensePolicy.create({
          workspaceId: validWorkspaceId,
          name: 'Travel Cap',
          policyType: PolicyType.SPENDING_LIMIT,
          severity: ViolationSeverity.HIGH,
          configuration: { threshold: 500, currency: 'USD' },
          createdBy: 'admin-1', // Invalid
        })
      ).toThrow('Invalid UserId format: admin-1');
    });

    it('should reject non-UUID identifiers in PolicyViolation', () => {
      expect(() =>
        PolicyViolation.create({
          workspaceId: validWorkspaceId,
          policyId: validPolicyId,
          expenseId: 'expense-1', // Invalid
          userId: validUserId,
          severity: ViolationSeverity.HIGH,
          violationDetails: 'Over limit',
          expenseAmount: 100,
        })
      ).toThrow('Invalid ExpenseId format: expense-1');

      expect(() =>
        PolicyViolation.create({
          workspaceId: validWorkspaceId,
          policyId: validPolicyId,
          expenseId: validExpenseId,
          userId: 'user-1', // Invalid
          severity: ViolationSeverity.HIGH,
          violationDetails: 'Over limit',
          expenseAmount: 100,
        })
      ).toThrow('Invalid UserId format: user-1');
    });

    it('should reject non-UUID actors during PolicyViolation acknowledgement and resolution', () => {
      const violation = PolicyViolation.create({
        workspaceId: validWorkspaceId,
        policyId: validPolicyId,
        expenseId: validExpenseId,
        userId: validUserId,
        severity: ViolationSeverity.HIGH,
        violationDetails: 'Over limit',
        expenseAmount: 100,
      });

      expect(() => violation.acknowledge('invalid-user')).toThrow('Invalid UserId format: invalid-user');
      expect(() => violation.resolve('invalid-admin', 'Done')).toThrow('Invalid UserId format: invalid-admin');
    });

    it('should reject non-UUID identifiers in PolicyExemption', () => {
      const now = new Date();
      const future = new Date(now.getTime() + 86400000);

      expect(() =>
        PolicyExemption.create({
          workspaceId: validWorkspaceId,
          policyId: validPolicyId,
          userId: 'user-xyz',
          requestedBy: validUserId,
          reason: 'Valid exemption reason over 10 chars',
          startDate: now,
          endDate: future,
        })
      ).toThrow('Invalid UserId format: user-xyz');
    });
  });

  describe('Policy Scope Alignment & Evaluation', () => {
    it('should evaluate modern appliesTo scope including categories, userRoles, and amounts', () => {
      const scope: PolicyScope = {
        categoryIds: [validCategoryId1],
        userRoles: ['FINANCE', 'EXECUTIVE'],
        minAmount: 100,
        maxAmount: 1000,
      };

      const policy = ExpensePolicy.create({
        workspaceId: validWorkspaceId,
        name: 'Executive Travel Policy',
        policyType: PolicyType.SPENDING_LIMIT,
        severity: ViolationSeverity.HIGH,
        configuration: { threshold: 500, currency: 'USD', appliesTo: scope },
        createdBy: validAdminId,
      });

      // Matches all criteria
      expect(
        policy.appliesTo({
          categoryId: validCategoryId1,
          userRole: 'FINANCE',
          amount: 500,
        })
      ).toBe(true);

      // Rejects category mismatch
      expect(
        policy.appliesTo({
          categoryId: validCategoryId2,
          userRole: 'FINANCE',
          amount: 500,
        })
      ).toBe(false);

      // Rejects role mismatch
      expect(
        policy.appliesTo({
          categoryId: validCategoryId1,
          userRole: 'ENGINEER',
          amount: 500,
        })
      ).toBe(false);

      // Rejects below minAmount
      expect(
        policy.appliesTo({
          categoryId: validCategoryId1,
          userRole: 'FINANCE',
          amount: 50,
        })
      ).toBe(false);

      // Rejects above maxAmount
      expect(
        policy.appliesTo({
          categoryId: validCategoryId1,
          userRole: 'FINANCE',
          amount: 1500,
        })
      ).toBe(false);

      // Rejects when amount is undefined for amount-scoped policy
      expect(
        policy.appliesTo({
          categoryId: validCategoryId1,
          userRole: 'FINANCE',
          amount: undefined,
        })
      ).toBe(false);
    });

    it('should maintain backward compatibility with legacy applyCategoryIds and applyToRoles', () => {
      const policy = ExpensePolicy.create({
        workspaceId: validWorkspaceId,
        name: 'Legacy Scoped Policy',
        policyType: PolicyType.SPENDING_LIMIT,
        severity: ViolationSeverity.MEDIUM,
        configuration: {
          threshold: 200,
          currency: 'USD',
          applyCategoryIds: [validCategoryId1],
          applyToRoles: ['SALES'],
        },
        createdBy: validAdminId,
      });

      expect(policy.appliesTo({ categoryId: validCategoryId1, userRole: 'SALES' })).toBe(true);
      expect(policy.appliesTo({ categoryId: validCategoryId2, userRole: 'SALES' })).toBe(false);
      expect(policy.appliesTo({ categoryId: validCategoryId1, userRole: 'MARKETING' })).toBe(false);
    });

    it('should validate scope UUIDs and min/max amount boundaries', () => {
      expect(() =>
        ExpensePolicy.create({
          workspaceId: validWorkspaceId,
          name: 'Invalid Scope Amount',
          policyType: PolicyType.SPENDING_LIMIT,
          severity: ViolationSeverity.HIGH,
          configuration: {
            threshold: 100,
            currency: 'USD',
            appliesTo: { minAmount: 500, maxAmount: 100 },
          },
          createdBy: validAdminId,
        })
      ).toThrow(InvalidScopeError);

      expect(() =>
        ExpensePolicy.create({
          workspaceId: validWorkspaceId,
          name: 'Invalid Scope Category',
          policyType: PolicyType.SPENDING_LIMIT,
          severity: ViolationSeverity.HIGH,
          configuration: {
            threshold: 100,
            currency: 'USD',
            appliesTo: { categoryIds: ['not-a-uuid'] },
          },
          createdBy: validAdminId,
        })
      ).toThrow(InvalidScopeError);
    });
  });

  describe('Configuration Immutability & Encapsulation', () => {
    it('should prevent external mutation of configuration passed into create()', () => {
      const externalConfig = {
        threshold: 500,
        currency: 'USD',
        restrictedCategoryIds: [validCategoryId1],
      };

      const policy = ExpensePolicy.create({
        workspaceId: validWorkspaceId,
        name: 'Immutable Policy',
        policyType: PolicyType.SPENDING_LIMIT,
        severity: ViolationSeverity.HIGH,
        configuration: externalConfig,
        createdBy: validAdminId,
      });

      // External mutation after creation
      externalConfig.threshold = -999;
      (externalConfig.restrictedCategoryIds as string[]).push(validCategoryId2);

      // Internal aggregate configuration remains intact
      expect(policy.configuration.threshold).toBe(500);
      expect(policy.configuration.restrictedCategoryIds).toEqual([validCategoryId1]);
    });

    it('should return frozen configuration object preventing in-place mutations', () => {
      const policy = ExpensePolicy.create({
        workspaceId: validWorkspaceId,
        name: 'Frozen Config Policy',
        policyType: PolicyType.SPENDING_LIMIT,
        severity: ViolationSeverity.HIGH,
        configuration: { threshold: 300, currency: 'USD' },
        createdBy: validAdminId,
      });

      const config = policy.configuration;
      expect(Object.isFrozen(config)).toBe(true);
      expect(() => {
        (config as any).threshold = 9999;
      }).toThrow();
    });
  });

  describe('Domain Constants & Invariants Enforcement', () => {
    it('should enforce priority bounds [0, 1000] and reject non-integers', () => {
      expect(() =>
        ExpensePolicy.create({
          workspaceId: validWorkspaceId,
          name: 'Negative Priority',
          policyType: PolicyType.SPENDING_LIMIT,
          severity: ViolationSeverity.LOW,
          configuration: { threshold: 100 },
          priority: -1,
          createdBy: validAdminId,
        })
      ).toThrow(InvalidPriorityError);

      expect(() =>
        ExpensePolicy.create({
          workspaceId: validWorkspaceId,
          name: 'Excessive Priority',
          policyType: PolicyType.SPENDING_LIMIT,
          severity: ViolationSeverity.LOW,
          configuration: { threshold: 100 },
          priority: 1001,
          createdBy: validAdminId,
        })
      ).toThrow(InvalidPriorityError);

      expect(() =>
        ExpensePolicy.create({
          workspaceId: validWorkspaceId,
          name: 'Fractional Priority',
          policyType: PolicyType.SPENDING_LIMIT,
          severity: ViolationSeverity.LOW,
          configuration: { threshold: 100 },
          priority: 5.5,
          createdBy: validAdminId,
        })
      ).toThrow(InvalidPriorityError);
    });

    it('should enforce threshold bounds and reject non-finite numbers', () => {
      expect(() =>
        ExpensePolicy.create({
          workspaceId: validWorkspaceId,
          name: 'Infinite Threshold',
          policyType: PolicyType.SPENDING_LIMIT,
          severity: ViolationSeverity.HIGH,
          configuration: { threshold: Infinity },
          createdBy: validAdminId,
        })
      ).toThrow(InvalidThresholdError);

      expect(() =>
        ExpensePolicy.create({
          workspaceId: validWorkspaceId,
          name: 'Excessive Threshold',
          policyType: PolicyType.SPENDING_LIMIT,
          severity: ViolationSeverity.HIGH,
          configuration: { threshold: 1_000_000_000 },
          createdBy: validAdminId,
        })
      ).toThrow(InvalidThresholdError);
    });

    it('[P2] should enforce valid ISO currency code for SPENDING_LIMIT policies', () => {
      expect(() =>
        ExpensePolicy.create({
          workspaceId: validWorkspaceId,
          name: 'Missing Currency Limit',
          policyType: PolicyType.SPENDING_LIMIT,
          severity: ViolationSeverity.HIGH,
          configuration: { threshold: 100 },
          createdBy: validAdminId,
        })
      ).toThrow(InvalidPolicyConfigurationError);

      expect(() =>
        ExpensePolicy.create({
          workspaceId: validWorkspaceId,
          name: 'Invalid Currency Limit',
          policyType: PolicyType.SPENDING_LIMIT,
          severity: ViolationSeverity.HIGH,
          configuration: { threshold: 100, currency: 'INVALID' },
          createdBy: validAdminId,
        })
      ).toThrow(InvalidPolicyConfigurationError);

      expect(() =>
        ExpensePolicy.create({
          workspaceId: validWorkspaceId,
          name: 'Valid Currency Limit',
          policyType: PolicyType.SPENDING_LIMIT,
          severity: ViolationSeverity.HIGH,
          configuration: { threshold: 100, currency: 'eur' },
          createdBy: validAdminId,
        })
      ).not.toThrow();
    });

    it('[P2] should enforce valid ISO currency code for APPROVAL_REQUIRED policies when monetary threshold is defined', () => {
      // Missing currency when threshold > 0
      expect(() =>
        ExpensePolicy.create({
          workspaceId: validWorkspaceId,
          name: 'Missing Currency Approval',
          policyType: PolicyType.APPROVAL_REQUIRED,
          severity: ViolationSeverity.MEDIUM,
          configuration: { threshold: 250 },
          createdBy: validAdminId,
        })
      ).toThrow(InvalidPolicyConfigurationError);

      // Invalid currency when threshold > 0
      expect(() =>
        ExpensePolicy.create({
          workspaceId: validWorkspaceId,
          name: 'Invalid Currency Approval',
          policyType: PolicyType.APPROVAL_REQUIRED,
          severity: ViolationSeverity.MEDIUM,
          configuration: { threshold: 250, currency: 'USDX' },
          createdBy: validAdminId,
        })
      ).toThrow(InvalidPolicyConfigurationError);

      // Negative threshold
      expect(() =>
        ExpensePolicy.create({
          workspaceId: validWorkspaceId,
          name: 'Negative Threshold Approval',
          policyType: PolicyType.APPROVAL_REQUIRED,
          severity: ViolationSeverity.MEDIUM,
          configuration: { threshold: -50, currency: 'USD' },
          createdBy: validAdminId,
        })
      ).toThrow(InvalidThresholdError);

      // Valid monetary threshold with currency
      expect(() =>
        ExpensePolicy.create({
          workspaceId: validWorkspaceId,
          name: 'Valid Approval Policy',
          policyType: PolicyType.APPROVAL_REQUIRED,
          severity: ViolationSeverity.MEDIUM,
          configuration: { threshold: 250, currency: 'usd' },
          createdBy: validAdminId,
        })
      ).not.toThrow();

      // Valid without threshold (threshold undefined or 0, non-monetary condition)
      expect(() =>
        ExpensePolicy.create({
          workspaceId: validWorkspaceId,
          name: 'No Threshold Approval Policy',
          policyType: PolicyType.APPROVAL_REQUIRED,
          severity: ViolationSeverity.MEDIUM,
          configuration: {},
          createdBy: validAdminId,
        })
      ).not.toThrow();
    });


    it('should enforce time restriction hour and day bounds', () => {
      expect(() =>
        ExpensePolicy.create({
          workspaceId: validWorkspaceId,
          name: 'Invalid Blocked Days',
          policyType: PolicyType.TIME_RESTRICTION,
          severity: ViolationSeverity.MEDIUM,
          configuration: { blockedDays: [7] }, // Only 0..6
          createdBy: validAdminId,
        })
      ).toThrow(InvalidPolicyConfigurationError);

      expect(() =>
        ExpensePolicy.create({
          workspaceId: validWorkspaceId,
          name: 'Invalid Blocked Hours Window',
          policyType: PolicyType.TIME_RESTRICTION,
          severity: ViolationSeverity.MEDIUM,
          configuration: { blockedHoursStart: 18, blockedHoursEnd: 18 }, // Start and end identical
          createdBy: validAdminId,
        })
      ).toThrow(InvalidPolicyConfigurationError);

      // Overnight window (e.g. 22:00 to 06:00) is valid and supported
      expect(() =>
        ExpensePolicy.create({
          workspaceId: validWorkspaceId,
          name: 'Valid Overnight Window',
          policyType: PolicyType.TIME_RESTRICTION,
          severity: ViolationSeverity.MEDIUM,
          configuration: { blockedHoursStart: 22, blockedHoursEnd: 6 },
          createdBy: validAdminId,
        })
      ).not.toThrow();
    });

    it('should enforce PolicyExemption reason length and 365-day maximum duration', () => {
      const now = new Date();
      const tooLongDuration = new Date(now.getTime() + 366 * 24 * 60 * 60 * 1000);
      const validFuture = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Duration exceeded
      expect(() =>
        PolicyExemption.create({
          workspaceId: validWorkspaceId,
          policyId: validPolicyId,
          userId: validUserId,
          requestedBy: validUserId,
          reason: 'Legitimate business travel requirement',
          startDate: now,
          endDate: tooLongDuration,
        })
      ).toThrow(ExemptionDurationExceededError);

      // Reason too short (< 10 chars)
      expect(() =>
        PolicyExemption.create({
          workspaceId: validWorkspaceId,
          policyId: validPolicyId,
          userId: validUserId,
          requestedBy: validUserId,
          reason: 'Too short',
          startDate: now,
          endDate: validFuture,
        })
      ).toThrow(ExemptionReasonLengthError);
    });

    it('should enforce note length constraints in PolicyViolation', () => {
      const violation = PolicyViolation.create({
        workspaceId: validWorkspaceId,
        policyId: validPolicyId,
        expenseId: validExpenseId,
        userId: validUserId,
        severity: ViolationSeverity.MEDIUM,
        violationDetails: 'Threshold breach',
        expenseAmount: 100,
      });

      const tooLongNote = 'a'.repeat(501);
      expect(() => violation.resolve(validAdminId, tooLongNote)).toThrow(ViolationNoteLengthError);

      // Override note must be >= 10 chars
      expect(() => violation.override(validAdminId, 'Short')).toThrow(ViolationNoteLengthError);
    });

    it('should validate ISO currency codes in PolicyViolation', () => {
      expect(() =>
        PolicyViolation.create({
          workspaceId: validWorkspaceId,
          policyId: validPolicyId,
          expenseId: validExpenseId,
          userId: validUserId,
          severity: ViolationSeverity.HIGH,
          violationDetails: 'Over limit',
          expenseAmount: 100,
          currency: 'INVALID_CURRENCY',
        })
      ).toThrow(InvalidPolicyConfigurationError);
    });

    it('should validate expenseAmount in PolicyViolation', () => {
      expect(() =>
        PolicyViolation.create({
          workspaceId: validWorkspaceId,
          policyId: validPolicyId,
          expenseId: validExpenseId,
          userId: validUserId,
          severity: ViolationSeverity.HIGH,
          violationDetails: 'Over limit',
          expenseAmount: -5,
        })
      ).toThrow('Expense amount must be a finite non-negative number');

      expect(() =>
        PolicyViolation.create({
          workspaceId: validWorkspaceId,
          policyId: validPolicyId,
          expenseId: validExpenseId,
          userId: validUserId,
          severity: ViolationSeverity.HIGH,
          violationDetails: 'Over limit',
          expenseAmount: NaN,
        })
      ).toThrow('Expense amount must be a finite non-negative number');
    });
  });

  describe('Lifecycle Events & Idempotency', () => {
    it('should emit PolicyUpdatedEvent on state mutations with accurate updatedFields', () => {
      const policy = ExpensePolicy.create({
        workspaceId: validWorkspaceId,
        name: 'Original Name',
        policyType: PolicyType.SPENDING_LIMIT,
        severity: ViolationSeverity.LOW,
        configuration: { threshold: 100, currency: 'USD' },
        priority: 10,
        createdBy: validAdminId,
      });

      policy.clearDomainEvents();

      // Update name
      policy.updateName('Updated Name');
      expect(policy.domainEvents).toHaveLength(1);
      const nameEvent = policy.domainEvents[0] as PolicyUpdatedEvent;
      expect(nameEvent.eventType).toBe(APPROVAL_POLICY_EVENTS.POLICY_UPDATED);
      expect(nameEvent.updatedFields).toEqual(['name']);

      // Calling update with identical value emits no event
      policy.clearDomainEvents();
      policy.updateName('Updated Name');
      expect(policy.domainEvents).toHaveLength(0);

      // Update priority
      policy.updatePriority(20);
      expect(policy.domainEvents).toHaveLength(1);
      expect((policy.domainEvents[0] as PolicyUpdatedEvent).updatedFields).toEqual(['priority']);

      // Update configuration
      policy.clearDomainEvents();
      policy.updateConfiguration({ threshold: 250, currency: 'USD' });
      expect(policy.domainEvents).toHaveLength(1);
      expect((policy.domainEvents[0] as PolicyUpdatedEvent).updatedFields).toEqual(['configuration']);
    });

    it('should make activate() and deactivate() idempotent without duplicate events', () => {
      const policy = ExpensePolicy.create({
        workspaceId: validWorkspaceId,
        name: 'Toggle Policy',
        policyType: PolicyType.SPENDING_LIMIT,
        severity: ViolationSeverity.LOW,
        configuration: { threshold: 100, currency: 'USD' },
        createdBy: validAdminId,
      });

      policy.clearDomainEvents();
      expect(policy.isActive).toBe(true);

      // Calling activate on already active policy should do nothing
      policy.activate();
      expect(policy.domainEvents).toHaveLength(0);

      // Deactivate toggles state and emits PolicyDeactivatedEvent
      policy.deactivate();
      expect(policy.isActive).toBe(false);
      expect(policy.domainEvents).toHaveLength(1);
      expect(policy.domainEvents[0].eventType).toBe(APPROVAL_POLICY_EVENTS.POLICY_DEACTIVATED);

      // Second deactivate call is an idempotent no-op
      policy.clearDomainEvents();
      policy.deactivate();
      expect(policy.domainEvents).toHaveLength(0);
    });

    it('should make PolicyViolation.acknowledge() idempotent', () => {
      const violation = PolicyViolation.create({
        workspaceId: validWorkspaceId,
        policyId: validPolicyId,
        expenseId: validExpenseId,
        userId: validUserId,
        severity: ViolationSeverity.MEDIUM,
        violationDetails: 'Unreceipted expense',
        expenseAmount: 75,
      });

      violation.clearDomainEvents();

      // First acknowledge emits event
      violation.acknowledge(validAdminId);
      expect(violation.status).toBe(ViolationStatus.ACKNOWLEDGED);
      expect(violation.domainEvents).toHaveLength(1);
      expect(violation.domainEvents[0].eventType).toBe(APPROVAL_POLICY_EVENTS.VIOLATION_ACKNOWLEDGED);

      // Second acknowledge by same user is an idempotent no-op
      violation.clearDomainEvents();
      violation.acknowledge(validAdminId);
      expect(violation.domainEvents).toHaveLength(0);
    });

    it('should reject transitions once resolved', () => {
      const violation = PolicyViolation.create({
        workspaceId: validWorkspaceId,
        policyId: validPolicyId,
        expenseId: validExpenseId,
        userId: validUserId,
        severity: ViolationSeverity.MEDIUM,
        violationDetails: 'Missing receipt for expense over $50',
        expenseAmount: 60,
      });

      violation.resolve(validAdminId, 'Approved exception');
      expect(violation.isResolved()).toBe(true);

      expect(() => violation.acknowledge(validUserId)).toThrow(ViolationAlreadyResolvedError);
      expect(() => violation.resolve(validAdminId)).toThrow(ViolationAlreadyResolvedError);
      expect(() => violation.exempt(validAdminId, undefined, validExemptionId)).toThrow(ViolationAlreadyResolvedError);
      expect(() => violation.override(validAdminId)).toThrow(ViolationAlreadyResolvedError);
    });

    it('should clear violation by re-evaluation with system actor', () => {
      const violation = PolicyViolation.create({
        workspaceId: validWorkspaceId,
        policyId: validPolicyId,
        expenseId: validExpenseId,
        userId: validUserId,
        severity: ViolationSeverity.MEDIUM,
        violationDetails: 'Threshold breach',
        expenseAmount: 120,
      });

      violation.clearDomainEvents();
      violation.clearByReevaluation('Cleared upon expense re-evaluation');

      expect(violation.status).toBe(ViolationStatus.RESOLVED);
      expect(violation.resolvedBy?.getValue()).toBe('00000000-0000-4000-a000-000000000000');
      expect(violation.resolutionNotes).toBe('Cleared upon expense re-evaluation');
      expect(violation.domainEvents).toHaveLength(1);
      expect(violation.domainEvents[0].eventType).toBe(APPROVAL_POLICY_EVENTS.VIOLATION_RESOLVED);

      // Subsequent call is idempotent
      violation.clearDomainEvents();
      violation.clearByReevaluation();
      expect(violation.domainEvents).toHaveLength(0);
    });

    it('[P1] PolicyViolation.reopen() should transition resolved violation to PENDING, reset lifecycle metadata, and emit PolicyViolationDetectedEvent', () => {
      const violation = PolicyViolation.create({
        workspaceId: validWorkspaceId,
        policyId: validPolicyId,
        expenseId: validExpenseId,
        userId: validUserId,
        severity: ViolationSeverity.MEDIUM,
        violationDetails: 'Threshold breach',
        expenseAmount: 120,
      });

      // Acknowledge, then resolve to set all lifecycle fields
      violation.acknowledge(validUserId, 'Initially acknowledged');
      violation.resolve(validAdminId, 'Resolved by admin');
      expect(violation.status).toBe(ViolationStatus.RESOLVED);
      expect(violation.acknowledgedBy).toBeDefined();
      expect(violation.acknowledgedAt).toBeDefined();
      expect(violation.resolvedBy).toBeDefined();
      expect(violation.resolvedAt).toBeDefined();
      expect(violation.resolutionNotes).toBeDefined();

      viration_reopen: {
        violation.clearDomainEvents();
        violation.reopen('Updated violation details', 150);

        expect(violation.status).toBe(ViolationStatus.PENDING);
        expect(violation.violationDetails).toBe('Updated violation details');
        expect(violation.expenseAmount).toBe(150);
        expect(violation.acknowledgedBy).toBeUndefined();
        expect(violation.acknowledgedAt).toBeUndefined();
        expect(violation.resolvedBy).toBeUndefined();
        expect(violation.resolvedAt).toBeUndefined();
        expect(violation.resolutionNotes).toBeUndefined();
        expect(violation.exemptionId).toBeUndefined();
        expect(violation.domainEvents).toHaveLength(1);
        expect(violation.domainEvents[0].eventType).toBe(APPROVAL_POLICY_EVENTS.VIOLATION_DETECTED);
      }
    });

    it('PolicyViolation.acknowledge() should store optional note and emit ViolationAcknowledgedEvent with note', () => {
      const violation = PolicyViolation.create({
        workspaceId: validWorkspaceId,
        policyId: validPolicyId,
        expenseId: validExpenseId,
        userId: validUserId,
        severity: ViolationSeverity.LOW,
        violationDetails: 'Minor detail',
        expenseAmount: 25,
      });

      violation.clearDomainEvents();
      violation.acknowledge(validUserId, 'User note explaining receipt delay');

      expect(violation.status).toBe(ViolationStatus.ACKNOWLEDGED);
      expect(violation.acknowledgedBy?.getValue()).toBe(validUserId);
      expect(violation.resolutionNotes).toBe('User note explaining receipt delay');
      expect(violation.domainEvents).toHaveLength(1);
      expect(violation.domainEvents[0].eventType).toBe(APPROVAL_POLICY_EVENTS.VIOLATION_ACKNOWLEDGED);
      expect((violation.domainEvents[0] as any).note).toBe('User note explaining receipt delay');
    });

    it('PolicyViolation.exempt() should throw InvalidExemptionForViolationError when exemptionId is empty', () => {
      const violation = PolicyViolation.create({
        workspaceId: validWorkspaceId,
        policyId: validPolicyId,
        expenseId: validExpenseId,
        userId: validUserId,
        severity: ViolationSeverity.LOW,
        violationDetails: 'Minor detail',
        expenseAmount: 25,
      });

      expect(() => violation.exempt(validAdminId, 'note', '')).toThrow(
        InvalidExemptionForViolationError
      );
    });

    it('should allow markExpired() on pending and approved exemptions when endDate is in the past', () => {
      const past = new Date(Date.now() - 10000);
      const pastStart = new Date(Date.now() - 20000);

      // Reconstituted past exemption
      const exemption = PolicyExemption.fromPersistence({
        exemptionId: PolicyExemption.create({
          workspaceId: validWorkspaceId,
          policyId: validPolicyId,
          userId: validUserId,
          requestedBy: validUserId,
          reason: 'Valid travel reason for temporary exemption',
          startDate: new Date(),
          endDate: new Date(Date.now() + 100000),
        }).id,
        workspaceId: PolicyExemption.create({
          workspaceId: validWorkspaceId,
          policyId: validPolicyId,
          userId: validUserId,
          requestedBy: validUserId,
          reason: 'Valid travel reason for temporary exemption',
          startDate: new Date(),
          endDate: new Date(Date.now() + 100000),
        }).workspaceId,
        policyId: PolicyExemption.create({
          workspaceId: validWorkspaceId,
          policyId: validPolicyId,
          userId: validUserId,
          requestedBy: validUserId,
          reason: 'Valid travel reason for temporary exemption',
          startDate: new Date(),
          endDate: new Date(Date.now() + 100000),
        }).policyId,
        userId: PolicyExemption.create({
          workspaceId: validWorkspaceId,
          policyId: validPolicyId,
          userId: validUserId,
          requestedBy: validUserId,
          reason: 'Valid travel reason for temporary exemption',
          startDate: new Date(),
          endDate: new Date(Date.now() + 100000),
        }).userId,
        requestedBy: PolicyExemption.create({
          workspaceId: validWorkspaceId,
          policyId: validPolicyId,
          userId: validUserId,
          requestedBy: validUserId,
          reason: 'Valid travel reason for temporary exemption',
          startDate: new Date(),
          endDate: new Date(Date.now() + 100000),
        }).requestedBy,
        reason: 'Temporary exemption for project',
        status: ExemptionStatus.PENDING,
        startDate: pastStart,
        endDate: past,
        createdAt: pastStart,
        updatedAt: pastStart,
      });

      exemption.clearDomainEvents();
      exemption.markExpired();

      expect(exemption.status).toBe(ExemptionStatus.EXPIRED);
      expect(exemption.domainEvents).toHaveLength(1);
      expect(exemption.domainEvents[0].eventType).toBe(APPROVAL_POLICY_EVENTS.EXEMPTION_EXPIRED);
    });

    it('should prevent approve() on an expired pending exemption without mutating aggregate state', () => {
      const pastStart = new Date(Date.now() - 20000);
      const pastEnd = new Date(Date.now() - 5000);

      const base = PolicyExemption.create({
        workspaceId: validWorkspaceId,
        policyId: validPolicyId,
        userId: validUserId,
        requestedBy: validUserId,
        reason: 'Temporary project exemption reason',
        startDate: new Date(),
        endDate: new Date(Date.now() + 60000),
      });

      const expiredPending = PolicyExemption.fromPersistence({
        exemptionId: base.id,
        workspaceId: base.workspaceId,
        policyId: base.policyId,
        userId: base.userId,
        requestedBy: base.requestedBy,
        reason: base.reason,
        status: ExemptionStatus.PENDING,
        startDate: pastStart,
        endDate: pastEnd,
        createdAt: pastStart,
        updatedAt: pastStart,
      });

      expiredPending.clearDomainEvents();

      expect(() => expiredPending.approve(validAdminId)).toThrow(ExemptionExpiredError);
      expect(expiredPending.status).toBe(ExemptionStatus.PENDING);
      expect(expiredPending.domainEvents).toHaveLength(0);
    });

    it('should validate rejection reason length (10 to 1000 chars) on PolicyExemption.reject()', () => {
      const exemption = PolicyExemption.create({
        workspaceId: validWorkspaceId,
        policyId: validPolicyId,
        userId: validUserId,
        requestedBy: validUserId,
        reason: 'Need travel exemption for upcoming conference in Tokyo',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      // Disallow empty or undefined reason
      expect(() => exemption.reject(validAdminId, '' as any)).toThrow(ExemptionReasonLengthError);
      expect(() => exemption.reject(validAdminId, undefined as any)).toThrow(ExemptionReasonLengthError);

      // Disallow reason < 10 characters
      expect(() => exemption.reject(validAdminId, 'Too short')).toThrow(ExemptionReasonLengthError);

      // Disallow reason > 1000 characters
      const tooLong = 'x'.repeat(1001);
      expect(() => exemption.reject(validAdminId, tooLong)).toThrow(ExemptionReasonLengthError);

      // Valid rejection reason
      const validReason = 'Budget constraints prevent approval of conference travel at this time.';
      exemption.clearDomainEvents();
      exemption.reject(validAdminId, validReason);

      expect(exemption.status).toBe(ExemptionStatus.REJECTED);
      expect(exemption.rejectionReason).toBe(validReason);
      expect(exemption.rejectedBy?.getValue()).toBe(validAdminId);
      expect(exemption.rejectedAt).toBeInstanceOf(Date);
      expect(exemption.domainEvents).toHaveLength(1);
      expect(exemption.domainEvents[0].eventType).toBe(APPROVAL_POLICY_EVENTS.EXEMPTION_REJECTED);
    });

    it('should update updatedAt on exemption date updates, reason updates, and expiration', () => {
      const pastTime = new Date('2026-01-01T00:00:00.000Z');
      const base = PolicyExemption.create({
        workspaceId: validWorkspaceId,
        policyId: validPolicyId,
        userId: validUserId,
        requestedBy: validUserId,
        reason: 'Temporary project exemption reason',
        startDate: new Date(),
        endDate: new Date(Date.now() + 60000),
      });

      const exemption = PolicyExemption.fromPersistence({
        exemptionId: base.id,
        workspaceId: base.workspaceId,
        policyId: base.policyId,
        userId: base.userId,
        requestedBy: base.requestedBy,
        reason: base.reason,
        status: ExemptionStatus.PENDING,
        startDate: new Date(Date.now() + 1000),
        endDate: new Date(Date.now() + 50000),
        createdAt: pastTime,
        updatedAt: pastTime,
      });

      expect(exemption.updatedAt).toEqual(pastTime);

      // updateDates updates updatedAt
      exemption.updateDates(new Date(Date.now() + 2000), new Date(Date.now() + 60000));
      expect(exemption.updatedAt.getTime()).toBeGreaterThan(pastTime.getTime());

      // updateReason updates updatedAt
      const updatedTime1 = exemption.updatedAt;
      exemption.updateReason('New updated reason that meets length requirements');
      expect(exemption.updatedAt.getTime()).toBeGreaterThanOrEqual(updatedTime1.getTime());
    });
  });

  describe('PolicyEvaluationService Time Restrictions', () => {
    it('should evaluate blocked hours window under TIME_RESTRICTION', async () => {
      const mockPolicy = ExpensePolicy.create({
        workspaceId: validWorkspaceId,
        name: 'Night Expense Restriction',
        policyType: PolicyType.TIME_RESTRICTION,
        severity: ViolationSeverity.HIGH,
        configuration: {
          blockedHoursStart: 22,
          blockedHoursEnd: 23,
        },
        createdBy: validAdminId,
      });

      const mockPolicyRepo: any = {
        findActiveByWorkspace: async () => ({ items: [mockPolicy], total: 1 }),
        findAllActiveByWorkspace: async () => [mockPolicy],
      };
      const mockViolationRepo: any = {
        save: async () => {},
        saveForExpense: async () => {},
      };
      const mockExemptionRepo: any = {
        findActiveForUser: async () => null,
        findActiveForUserPolicies: async () => new Map(),
      };

      const evaluationService = new PolicyEvaluationService(
        mockPolicyRepo,
        mockViolationRepo,
        mockExemptionRepo
      );

      // 1. Expense at 22:30 UTC (during blocked hours)
      const nightDate = new Date();
      nightDate.setUTCHours(22, 30, 0, 0);

      const resultNight = await evaluationService.evaluateExpense({
        expenseId: validExpenseId,
        workspaceId: validWorkspaceId,
        userId: validUserId,
        amount: 50,
        currency: 'USD',
        hasReceipt: true,
        expenseDate: nightDate,
      });

      expect(resultNight.passed).toBe(false);
      expect(resultNight.violations).toHaveLength(1);
      expect(resultNight.violations[0].violationDetails).toContain('Expenses are not allowed between 22:00 and 23:00');

      // 2. Expense at 14:00 UTC (outside blocked hours)
      const dayDate = new Date();
      dayDate.setUTCHours(14, 0, 0, 0);

      const resultDay = await evaluationService.evaluateExpense({
        expenseId: validExpenseId,
        workspaceId: validWorkspaceId,
        userId: validUserId,
        amount: 50,
        currency: 'USD',
        hasReceipt: true,
        expenseDate: dayDate,
      });

      expect(resultDay.passed).toBe(true);
      expect(resultDay.violations).toHaveLength(0);
    });
  });

  describe('ExemptionService Lifecycle & Expiration Persistence', () => {
    it('should detect expired pending exemption on approveExemption, persist EXPIRED status, and throw ExemptionExpiredError', async () => {
      const pastStart = new Date(Date.now() - 20000);
      const pastEnd = new Date(Date.now() - 5000);

      const base = PolicyExemption.create({
        workspaceId: validWorkspaceId,
        policyId: validPolicyId,
        userId: validUserId,
        requestedBy: validUserId,
        reason: 'Temporary project exemption reason',
        startDate: new Date(),
        endDate: new Date(Date.now() + 60000),
      });

      const expiredPending = PolicyExemption.fromPersistence({
        exemptionId: base.id,
        workspaceId: base.workspaceId,
        policyId: base.policyId,
        userId: base.userId,
        requestedBy: base.requestedBy,
        reason: base.reason,
        status: ExemptionStatus.PENDING,
        startDate: pastStart,
        endDate: pastEnd,
        createdAt: pastStart,
        updatedAt: pastStart,
      });

      let savedExemption: PolicyExemption | null = null;
      const mockExemptionRepo: any = {
        findById: async () => expiredPending,
        save: async (ex: PolicyExemption) => {
          savedExemption = ex;
        },
      };

      const mockPolicyRepo: any = {
        findById: async () => null,
      };
      const exemptionService = new ExemptionService(mockExemptionRepo, mockPolicyRepo);

      await expect(
        exemptionService.approveExemption(base.id.getValue(), validWorkspaceId, validAdminId)
      ).rejects.toThrow(ExemptionExpiredError);

      expect(savedExemption).not.toBeNull();
      expect(savedExemption!.status).toBe(ExemptionStatus.EXPIRED);
      expect(savedExemption!.domainEvents).toHaveLength(1);
      expect(savedExemption!.domainEvents[0].eventType).toBe(APPROVAL_POLICY_EVENTS.EXEMPTION_EXPIRED);
    });

    it('[P1] should prevent self-approval even when approver ID has different UUID casing than requestedBy', async () => {
      const exemption = PolicyExemption.create({
        workspaceId: validWorkspaceId,
        policyId: validPolicyId,
        userId: validUserId, // '33333333-3333-4333-a333-333333333333' (lowercase 'a')
        requestedBy: validUserId,
        reason: 'Self approval test exemption',
        startDate: new Date(),
        endDate: new Date(Date.now() + 60000),
      });

      const mockExemptionRepo: any = {
        findById: async () => exemption,
        save: vi.fn(),
      };
      const mockPolicyRepo: any = {
        findById: async () => null,
      };
      const exemptionService = new ExemptionService(mockExemptionRepo, mockPolicyRepo);

      // Pass exact same UUID but with uppercase 'A'
      const uppercaseApproverId = validUserId.toUpperCase();

      await expect(
        exemptionService.approveExemption(exemption.id.getValue(), validWorkspaceId, uppercaseApproverId)
      ).rejects.toThrow(UnauthorizedExemptionApprovalError);

      expect(mockExemptionRepo.save).not.toHaveBeenCalled();
    });

    it('[P1] PolicyExemption.fromPersistence should validate reconstituted scope and reject invalid bounds', () => {
      const base = PolicyExemption.create({
        workspaceId: validWorkspaceId,
        policyId: validPolicyId,
        userId: validUserId,
        requestedBy: validUserId,
        reason: 'Valid travel reason for temporary exemption',
        startDate: new Date(),
        endDate: new Date(Date.now() + 100000),
      });

      expect(() =>
        PolicyExemption.fromPersistence({
          exemptionId: base.id,
          workspaceId: base.workspaceId,
          policyId: base.policyId,
          userId: base.userId,
          requestedBy: base.requestedBy,
          reason: base.reason,
          status: ExemptionStatus.PENDING,
          startDate: base.startDate,
          endDate: base.endDate,
          scope: { maxAmount: -100 }, // Invalid negative amount
          createdAt: base.createdAt,
          updatedAt: base.updatedAt,
        })
      ).toThrow(InvalidThresholdError);
    });

    it('should expire both approved and pending exemptions in ExpireExemptionsHandler', async () => {
      const pastStart = new Date(Date.now() - 20000);
      const pastEnd = new Date(Date.now() - 5000);

      const baseApproved = PolicyExemption.create({
        workspaceId: validWorkspaceId,
        policyId: validPolicyId,
        userId: validUserId,
        requestedBy: validUserId,
        reason: 'Approved conference exemption',
        startDate: new Date(),
        endDate: new Date(Date.now() + 60000),
      });

      const expiredApproved = PolicyExemption.fromPersistence({
        exemptionId: baseApproved.id,
        workspaceId: baseApproved.workspaceId,
        policyId: baseApproved.policyId,
        userId: baseApproved.userId,
        requestedBy: baseApproved.requestedBy,
        reason: baseApproved.reason,
        status: ExemptionStatus.APPROVED,
        startDate: pastStart,
        endDate: pastEnd,
        createdAt: pastStart,
        updatedAt: pastStart,
      });

      const basePending = PolicyExemption.create({
        workspaceId: validWorkspaceId,
        policyId: validPolicyId,
        userId: validUserId,
        requestedBy: validUserId,
        reason: 'Pending travel exemption',
        startDate: new Date(),
        endDate: new Date(Date.now() + 60000),
      });

      const expiredPending = PolicyExemption.fromPersistence({
        exemptionId: basePending.id,
        workspaceId: basePending.workspaceId,
        policyId: basePending.policyId,
        userId: basePending.userId,
        requestedBy: basePending.requestedBy,
        reason: basePending.reason,
        status: ExemptionStatus.PENDING,
        startDate: pastStart,
        endDate: pastEnd,
        createdAt: pastStart,
        updatedAt: pastStart,
      });

      const savedList: PolicyExemption[] = [];
      const mockExemptionRepo: any = {
        findByWorkspace: async (_ws: string, filter: any) => {
          if (filter.status === ExemptionStatus.APPROVED) {
            return { items: [expiredApproved], total: 1 };
          }
          if (filter.status === ExemptionStatus.PENDING) {
            return { items: [expiredPending], total: 1 };
          }
          return { items: [], total: 0 };
        },
        save: async (ex: PolicyExemption) => {
          savedList.push(ex);
        },
        expireExpiredBatch: async (_ws: any, _now: any, _limit: any) => {
          let count = 0;
          for (const ex of [expiredApproved, expiredPending]) {
            if (ex.isExpired() && !savedList.includes(ex)) {
              ex.markExpired();
              savedList.push(ex);
              count++;
            }
          }
          return count;
        },
      };

      const mockOperations: any = {
        authorize: vi.fn().mockResolvedValue({}),
      };

      const handler = new ExpireExemptionsHandler(mockExemptionRepo, mockOperations);
      const result = await handler.handle({
        workspaceId: validWorkspaceId,
        servicePrincipal: 'cron-worker',
      });

      expect(result.success).toBe(true);
      expect(savedList).toHaveLength(2);
      expect(savedList[0].status).toBe(ExemptionStatus.EXPIRED);
      expect(savedList[1].status).toBe(ExemptionStatus.EXPIRED);
    });
  });

  describe('PolicyEvaluationService Advanced Behaviors', () => {
    const createEvaluationService = (policies: ExpensePolicy[]) => {
      const mockPolicyRepo: any = {
        findActiveByWorkspace: async () => ({ items: policies, total: policies.length }),
        findAllActiveByWorkspace: async () => policies,
      };
      const mockViolationRepo: any = {
        save: async () => {},
        saveForExpense: async () => {},
      };
      const mockExemptionRepo: any = {
        findActiveForUser: async () => null,
        findActiveForUserPolicies: async () => new Map(),
      };

      return new PolicyEvaluationService(
        mockPolicyRepo,
        mockViolationRepo,
        mockExemptionRepo
      );
    };

    it('should evaluate APPROVAL_REQUIRED policy and set requiresApproval with approvalRequiredPolicyIds', async () => {
      const approvalPolicy = ExpensePolicy.create({
        workspaceId: validWorkspaceId,
        name: 'Manager Approval Required Over $500',
        policyType: PolicyType.APPROVAL_REQUIRED,
        severity: ViolationSeverity.MEDIUM,
        configuration: {
          threshold: 500,
          currency: 'USD',
        },
        createdBy: validAdminId,
      });

      const evalService = createEvaluationService([approvalPolicy]);

      // 1. Below threshold: passes, no approval required
      const passResult = await evalService.evaluateExpense({
        workspaceId: validWorkspaceId,
        expenseId: validExpenseId,
        userId: validUserId,
        amount: 400,
        currency: 'USD',
        hasReceipt: true,
        expenseDate: new Date(),
      });
      expect(passResult.passed).toBe(true);
      expect(passResult.requiresApproval).toBe(false);
      expect(passResult.approvalRequiredPolicyIds).toEqual([]);

      // 2. Over threshold: fails pass check, requiresApproval is true with policyId
      const approvalResult = await evalService.evaluateExpense({
        workspaceId: validWorkspaceId,
        expenseId: validExpenseId,
        userId: validUserId,
        amount: 600,
        currency: 'USD',
        hasReceipt: true,
        expenseDate: new Date(),
      });
      expect(approvalResult.passed).toBe(false);
      expect(approvalResult.requiresApproval).toBe(true);
      expect(approvalResult.approvalRequiredPolicyIds).toEqual([approvalPolicy.id.getValue()]);
      expect(approvalResult.violations).toHaveLength(1);
    });

    it('should fail-closed on currency mismatch for SPENDING_LIMIT and APPROVAL_REQUIRED', async () => {
      const spendingLimitPolicy = ExpensePolicy.create({
        workspaceId: validWorkspaceId,
        name: 'EUR Spending Limit',
        policyType: PolicyType.SPENDING_LIMIT,
        severity: ViolationSeverity.HIGH,
        configuration: {
          threshold: 1000,
          currency: 'EUR',
        },
        createdBy: validAdminId,
      });

      const approvalPolicy = ExpensePolicy.create({
        workspaceId: validWorkspaceId,
        name: 'GBP Approval Required',
        policyType: PolicyType.APPROVAL_REQUIRED,
        severity: ViolationSeverity.MEDIUM,
        configuration: {
          threshold: 500,
          currency: 'GBP',
        },
        createdBy: validAdminId,
      });

      const evalService = createEvaluationService([spendingLimitPolicy, approvalPolicy]);

      const result = await evalService.evaluateExpense({
        workspaceId: validWorkspaceId,
        expenseId: validExpenseId,
        userId: validUserId,
        amount: 200,
        currency: 'USD',
        hasReceipt: true,
        expenseDate: new Date(),
      });

      expect(result.passed).toBe(false);
      expect(result.requiresApproval).toBe(true);
      expect(result.violations).toHaveLength(2);
      expect(result.violations[0].violationDetails).toContain('currency mismatch');
      expect(result.violations[1].violationDetails).toContain('currency mismatch');
    });

    it('should enforce timezone-aware TIME_RESTRICTION and reject invalid IANA timezones', async () => {
      const timePolicy = ExpensePolicy.create({
        workspaceId: validWorkspaceId,
        name: 'Afternoon Window Restriction',
        policyType: PolicyType.TIME_RESTRICTION,
        severity: ViolationSeverity.HIGH,
        configuration: {
          blockedHoursStart: 14,
          blockedHoursEnd: 16,
        },
        createdBy: validAdminId,
      });

      const evalService = createEvaluationService([timePolicy]);

      // 10:00 UTC
      const fixedDate = new Date('2026-06-15T10:00:00Z');

      // In Asia/Tokyo (UTC+9): 10:00 UTC is 19:00 JST -> outside 14-16 -> passes
      const tokyoResult = await evalService.evaluateExpense({
        workspaceId: validWorkspaceId,
        expenseId: validExpenseId,
        userId: validUserId,
        amount: 50,
        currency: 'USD',
        hasReceipt: true,
        expenseDate: fixedDate,
        timezone: 'Asia/Tokyo',
      });
      expect(tokyoResult.passed).toBe(true);

      // In Asia/Dubai (UTC+4): 10:00 UTC is 14:00 GST -> within 14-16 window -> blocked
      const dubaiResult = await evalService.evaluateExpense({
        workspaceId: validWorkspaceId,
        expenseId: validExpenseId,
        userId: validUserId,
        amount: 50,
        currency: 'USD',
        hasReceipt: true,
        expenseDate: fixedDate,
        timezone: 'Asia/Dubai',
      });
      expect(dubaiResult.passed).toBe(false);
      expect(dubaiResult.violations[0].violationDetails).toContain('Expenses are not allowed between 14:00 and 16:00');

      // Invalid IANA timezone: should reject and throw PolicyEvaluationError
      await expect(
        evalService.evaluateExpense({
          workspaceId: validWorkspaceId,
          expenseId: validExpenseId,
          userId: validUserId,
          amount: 50,
          currency: 'USD',
          hasReceipt: true,
          expenseDate: fixedDate,
          timezone: 'Invalid/Non_Existent_Timezone_123',
        })
      ).rejects.toThrow(PolicyEvaluationError);
    });

    it('should create violation when allowedCategoryIds is configured but expense category is missing', async () => {
      const categoryPolicy = ExpensePolicy.create({
        workspaceId: validWorkspaceId,
        name: 'Allowed Categories Only',
        policyType: PolicyType.CATEGORY_RESTRICTION,
        severity: ViolationSeverity.HIGH,
        configuration: {
          allowedCategoryIds: [validCategoryId1, validCategoryId2],
        },
        createdBy: validAdminId,
      });

      const evalService = createEvaluationService([categoryPolicy]);

      // Expense without category
      const result = await evalService.evaluateExpense({
        workspaceId: validWorkspaceId,
        expenseId: validExpenseId,
        userId: validUserId,
        amount: 100,
        currency: 'USD',
        hasReceipt: true,
        expenseDate: new Date(),
        categoryId: undefined,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].violationDetails).toContain(
        `Category is required by policy "${categoryPolicy.name}" and must be one of the allowed categories`
      );
    });

    it('should retain highest-priority critical policy as blockedByPolicy when multiple critical policies trigger', async () => {
      const lowerPriorityCritical = ExpensePolicy.create({
        workspaceId: validWorkspaceId,
        name: 'Lower Priority Critical Limit',
        policyType: PolicyType.SPENDING_LIMIT,
        severity: ViolationSeverity.CRITICAL,
        priority: 10,
        configuration: {
          threshold: 100,
          currency: 'USD',
        },
        createdBy: validAdminId,
      });

      const higherPriorityCritical = ExpensePolicy.create({
        workspaceId: validWorkspaceId,
        name: 'Higher Priority Critical Limit',
        policyType: PolicyType.SPENDING_LIMIT,
        severity: ViolationSeverity.CRITICAL,
        priority: 90,
        configuration: {
          threshold: 50,
          currency: 'USD',
        },
        createdBy: validAdminId,
      });

      const evalService = createEvaluationService([lowerPriorityCritical, higherPriorityCritical]);

      const result = await evalService.evaluateExpense({
        workspaceId: validWorkspaceId,
        expenseId: validExpenseId,
        userId: validUserId,
        amount: 200,
        currency: 'USD',
        hasReceipt: true,
        expenseDate: new Date(),
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(2);
      expect(result.blockedByPolicy).toBeDefined();
      expect(result.blockedByPolicy?.id.getValue()).toBe(higherPriorityCritical.id.getValue());
      expect(result.blockedByPolicy?.name).toBe('Higher Priority Critical Limit');
    });
  });

  describe('PolicyExemption Scope & appliesTo Evaluation', () => {
    it('[P1] should evaluate appliesTo based on categoryIds and maxAmount scope', () => {
      const exemption = PolicyExemption.create({
        workspaceId: validWorkspaceId,
        policyId: validPolicyId,
        userId: validUserId,
        requestedBy: validUserId,
        reason: 'Category-specific exemption for meals',
        startDate: new Date(Date.now() - 10000),
        endDate: new Date(Date.now() + 86400000),
        scope: {
          categoryIds: ['meals-cat-1', 'meals-cat-2'],
          maxAmount: 150,
        },
      });

      // Initially PENDING -> should not apply
      expect(exemption.appliesTo({ categoryId: 'meals-cat-1', amount: 100 })).toBe(false);

      // Approve exemption
      exemption.approve(validAdminId, 'Approved by admin');
      expect(exemption.isActive()).toBe(true);

      // Matching category and within max amount -> applies
      expect(exemption.appliesTo({ categoryId: 'meals-cat-1', amount: 100 })).toBe(true);
      expect(exemption.appliesTo({ categoryId: 'meals-cat-2', amount: 150 })).toBe(true);

      // Non-matching category -> does NOT apply
      expect(exemption.appliesTo({ categoryId: 'travel-cat-1', amount: 100 })).toBe(false);

      // Amount exceeding maxAmount -> does NOT apply
      expect(exemption.appliesTo({ categoryId: 'meals-cat-1', amount: 151 })).toBe(false);
    });

    it('[P1] should apply unconditionally when exemption has no scope', () => {
      const exemption = PolicyExemption.create({
        workspaceId: validWorkspaceId,
        policyId: validPolicyId,
        userId: validUserId,
        requestedBy: validUserId,
        reason: 'Unrestricted policy exemption',
        startDate: new Date(Date.now() - 10000),
        endDate: new Date(Date.now() + 86400000),
      });

      exemption.approve(validAdminId);

      expect(exemption.appliesTo({ categoryId: 'any-category', amount: 99999 })).toBe(true);
    });

    it('[P1] PolicyEvaluationService should respect scoped exemption during expense evaluation', async () => {
      const policy = ExpensePolicy.create({
        workspaceId: validWorkspaceId,
        name: 'Meal Policy',
        policyType: PolicyType.SPENDING_LIMIT,
        severity: ViolationSeverity.HIGH,
        configuration: { threshold: 50, currency: 'USD' },
        createdBy: validAdminId,
      });

      const scopedExemption = PolicyExemption.create({
        workspaceId: validWorkspaceId,
        policyId: policy.id.getValue(),
        userId: validUserId,
        requestedBy: validUserId,
        reason: 'Client dinner scope',
        startDate: new Date(Date.now() - 10000),
        endDate: new Date(Date.now() + 86400000),
        scope: { categoryIds: ['meals-cat'], maxAmount: 100 },
      });
      scopedExemption.approve(validAdminId);

      const mockPolicyRepo: any = {
        findAllActiveByWorkspace: async () => [policy],
      };
      const mockViolationRepo: any = {
        saveForExpense: async () => {},
      };
      const mockExemptionRepo: any = {
        findActiveForUserPolicies: async () => new Map([[policy.id.getValue(), scopedExemption]]),
      };

      const evalService = new PolicyEvaluationService(
        mockPolicyRepo,
        mockViolationRepo,
        mockExemptionRepo
      );

      // Within scope ($80 <= $100 and category matches) -> no violation
      const passResult = await evalService.evaluateExpense({
        workspaceId: validWorkspaceId,
        expenseId: validExpenseId,
        userId: validUserId,
        amount: 80,
        currency: 'USD',
        categoryId: 'meals-cat',
        hasReceipt: true,
        expenseDate: new Date(),
      });
      expect(passResult.passed).toBe(true);
      expect(passResult.violations).toHaveLength(0);

      // Outside scope ($120 > $100) -> violation generated
      const failResult = await evalService.evaluateExpense({
        workspaceId: validWorkspaceId,
        expenseId: validExpenseId,
        userId: validUserId,
        amount: 120,
        currency: 'USD',
        categoryId: 'meals-cat',
        hasReceipt: true,
        expenseDate: new Date(),
      });
      expect(failResult.passed).toBe(false);
      expect(failResult.violations).toHaveLength(1);
    });
  });
});
