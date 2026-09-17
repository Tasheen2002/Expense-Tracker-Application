import { describe, it, expect } from 'vitest';
import {
  POLICY_NAME_MIN_LENGTH,
  POLICY_NAME_MAX_LENGTH,
  POLICY_DESCRIPTION_MAX_LENGTH,
  MIN_PRIORITY,
  MAX_PRIORITY,
  MIN_THRESHOLD_AMOUNT,
  MAX_THRESHOLD_AMOUNT,
  EXEMPTION_REASON_MIN_LENGTH,
  EXEMPTION_REASON_MAX_LENGTH,
  EXEMPTION_MAX_DURATION_DAYS,
  VIOLATION_NOTE_MAX_LENGTH,
  OVERRIDE_REASON_MIN_LENGTH,
  OVERRIDE_REASON_MAX_LENGTH,
  MAX_BLACKLISTED_MERCHANTS,
  MAX_RESTRICTED_CATEGORIES,
  MAX_ALLOWED_CATEGORIES,
  AGGREGATE_TYPE_EXPENSE_POLICY,
  AGGREGATE_TYPE_POLICY_VIOLATION,
  AGGREGATE_TYPE_POLICY_EXEMPTION,
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
  MIN_PAGE_OFFSET,
} from '../domain/constants';
import {
  PolicyType,
  PolicyTypeLabels,
  ViolationSeverity,
  ViolationSeverityLabels,
  ViolationSeverityOrder,
  ViolationStatus,
  ViolationStatusLabels,
  ExemptionStatus,
  ExemptionStatusLabels,
} from '../domain/enums';
import {
  PolicyControlsDomainError,
  PolicyNotFoundError,
  PolicyNameAlreadyExistsError,
  InvalidPolicyConfigurationError,
  PolicyNameRequiredError,
  PolicyNameTooLongError,
  PolicyDescriptionTooLongError,
  InvalidThresholdError,
  PolicyAlreadyActiveError,
  PolicyAlreadyInactiveError,
  ViolationNotFoundError,
  ViolationAlreadyResolvedError,
  InvalidViolationTransitionError,
  UnauthorizedViolationActionError,
  ExemptionNotFoundError,
  ExemptionAlreadyProcessedError,
  ExemptionExpiredError,
  InvalidExemptionDateRangeError,
  UnauthorizedExemptionApprovalError,
  ExpenseBlockedByPolicyError,
  PolicyEvaluationError,
  InvalidPriorityError,
  ExemptionDurationExceededError,
  ExemptionReasonLengthError,
  ViolationNoteLengthError,
  InvalidScopeError,
} from '../domain/errors';
import { PureDomainError } from '../../../shared/errors/pure-domain-error';
import {
  mapDomainCodeToHttpStatus,
  resolveHttpStatus,
} from '../../../shared/errors/error-http-mapper';
import { ResponseHelper } from '../../../shared/response.helper';
import {
  IPolicyRepository,
  IViolationRepository,
  IExemptionRepository,
  ViolationFilters,
  ExemptionFilters,
} from '../domain/repositories';

describe('Policy Controls Domain - Constants, Enums, Errors, Repositories', () => {
  // ==========================================================================
  // 1. Constants
  // ==========================================================================
  describe('Constants Verification', () => {
    it('should define valid policy name and description bounds', () => {
      expect(POLICY_NAME_MIN_LENGTH).toBe(1);
      expect(POLICY_NAME_MAX_LENGTH).toBe(100);
      expect(POLICY_DESCRIPTION_MAX_LENGTH).toBe(500);
      expect(POLICY_NAME_MIN_LENGTH).toBeLessThan(POLICY_NAME_MAX_LENGTH);
    });

    it('should define valid priority bounds', () => {
      expect(MIN_PRIORITY).toBe(0);
      expect(MAX_PRIORITY).toBe(1000);
      expect(MIN_PRIORITY).toBeLessThan(MAX_PRIORITY);
    });

    it('should define valid amount threshold bounds', () => {
      expect(MIN_THRESHOLD_AMOUNT).toBe(0);
      expect(MAX_THRESHOLD_AMOUNT).toBe(999999999);
      expect(MIN_THRESHOLD_AMOUNT).toBeLessThan(MAX_THRESHOLD_AMOUNT);
    });

    it('should define valid exemption constraints', () => {
      expect(EXEMPTION_REASON_MIN_LENGTH).toBe(10);
      expect(EXEMPTION_REASON_MAX_LENGTH).toBe(1000);
      expect(EXEMPTION_MAX_DURATION_DAYS).toBe(365);
      expect(EXEMPTION_REASON_MIN_LENGTH).toBeLessThan(EXEMPTION_REASON_MAX_LENGTH);
    });

    it('should define valid violation and override note bounds', () => {
      expect(VIOLATION_NOTE_MAX_LENGTH).toBe(500);
      expect(OVERRIDE_REASON_MIN_LENGTH).toBe(10);
      expect(OVERRIDE_REASON_MAX_LENGTH).toBe(500);
      expect(OVERRIDE_REASON_MIN_LENGTH).toBeLessThan(OVERRIDE_REASON_MAX_LENGTH);
    });

    it('should define list size limits', () => {
      expect(MAX_BLACKLISTED_MERCHANTS).toBe(100);
      expect(MAX_RESTRICTED_CATEGORIES).toBe(50);
      expect(MAX_ALLOWED_CATEGORIES).toBe(50);
    });

    it('should define outbox aggregate types and pagination constants', () => {
      expect(AGGREGATE_TYPE_EXPENSE_POLICY).toBe('ExpensePolicy');
      expect(AGGREGATE_TYPE_POLICY_VIOLATION).toBe('PolicyViolation');
      expect(AGGREGATE_TYPE_POLICY_EXEMPTION).toBe('PolicyExemption');

      expect(DEFAULT_PAGE_LIMIT).toBe(50);
      expect(MAX_PAGE_LIMIT).toBe(100);
      expect(MIN_PAGE_OFFSET).toBe(0);
    });
  });

  // ==========================================================================
  // 2. Enums
  // ==========================================================================
  describe('Enums Verification', () => {
    it('should verify PolicyType enum values and label mappings', () => {
      const expectedTypes = [
        'SPENDING_LIMIT',
        'DAILY_LIMIT',
        'WEEKLY_LIMIT',
        'MONTHLY_LIMIT',
        'CATEGORY_RESTRICTION',
        'RECEIPT_REQUIRED',
        'APPROVAL_REQUIRED',
        'MERCHANT_BLACKLIST',
        'TIME_RESTRICTION',
        'DESCRIPTION_REQUIRED',
      ];

      for (const type of expectedTypes) {
        expect(Object.values(PolicyType)).toContain(type);
        expect(PolicyTypeLabels[type as PolicyType]).toBeDefined();
        expect(typeof PolicyTypeLabels[type as PolicyType]).toBe('string');
      }
      expect(Object.keys(PolicyTypeLabels)).toHaveLength(expectedTypes.length);
    });

    it('should verify ViolationSeverity enum values, labels, and order hierarchy', () => {
      const expectedSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

      for (const sev of expectedSeverities) {
        expect(Object.values(ViolationSeverity)).toContain(sev);
        expect(ViolationSeverityLabels[sev as ViolationSeverity]).toBeDefined();
        expect(ViolationSeverityOrder[sev as ViolationSeverity]).toBeDefined();
      }

      // Verify severity escalation order
      expect(ViolationSeverityOrder[ViolationSeverity.LOW]).toBeLessThan(
        ViolationSeverityOrder[ViolationSeverity.MEDIUM]
      );
      expect(ViolationSeverityOrder[ViolationSeverity.MEDIUM]).toBeLessThan(
        ViolationSeverityOrder[ViolationSeverity.HIGH]
      );
      expect(ViolationSeverityOrder[ViolationSeverity.HIGH]).toBeLessThan(
        ViolationSeverityOrder[ViolationSeverity.CRITICAL]
      );
    });

    it('should verify ViolationStatus enum values and label mappings', () => {
      const expectedStatuses = [
        'PENDING',
        'ACKNOWLEDGED',
        'EXEMPTED',
        'RESOLVED',
        'OVERRIDDEN',
      ];

      for (const status of expectedStatuses) {
        expect(Object.values(ViolationStatus)).toContain(status);
        expect(ViolationStatusLabels[status as ViolationStatus]).toBeDefined();
      }
    });

    it('should verify ExemptionStatus enum values and label mappings', () => {
      const expectedStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'];

      for (const status of expectedStatuses) {
        expect(Object.values(ExemptionStatus)).toContain(status);
        expect(ExemptionStatusLabels[status as ExemptionStatus]).toBeDefined();
      }
    });
  });

  // ==========================================================================
  // 3. Errors & HTTP Mapping
  // ==========================================================================
  describe('Errors & HTTP Mapping Verification', () => {
    it('should ensure all domain errors inherit from PolicyControlsDomainError and PureDomainError', () => {
      const errors = [
        new PolicyNotFoundError('pol-1'),
        new PolicyNameAlreadyExistsError('Travel', 'ws-1'),
        new InvalidPolicyConfigurationError('Bad config'),
        new PolicyNameRequiredError(),
        new PolicyNameTooLongError(100),
        new PolicyDescriptionTooLongError(500),
        new InvalidThresholdError('Negative threshold'),
        new PolicyAlreadyActiveError('pol-1'),
        new PolicyAlreadyInactiveError('pol-1'),
        new ViolationNotFoundError('viol-1'),
        new ViolationAlreadyResolvedError('viol-1'),
        new InvalidViolationTransitionError('PENDING', 'RESOLVED'),
        new UnauthorizedViolationActionError('user-1', 'resolve'),
        new ExemptionNotFoundError('ex-1'),
        new ExemptionAlreadyProcessedError('ex-1'),
        new ExemptionExpiredError('ex-1'),
        new InvalidExemptionDateRangeError(),
        new UnauthorizedExemptionApprovalError('user-1'),
        new ExpenseBlockedByPolicyError('exp-1', 'Strict Policy'),
        new PolicyEvaluationError('Calculation failed'),
        new InvalidPriorityError('Priority exceeds 1000'),
        new ExemptionDurationExceededError(365),
        new ExemptionReasonLengthError('Too short'),
        new ViolationNoteLengthError('Too long'),
        new InvalidScopeError('min > max'),
      ];

      for (const error of errors) {
        expect(error).toBeInstanceOf(PolicyControlsDomainError);
        expect(error).toBeInstanceOf(PureDomainError);
        expect(error.name).toBe(error.constructor.name);
        expect(error.code).toBeDefined();
        expect(error.message).toBeTruthy();
        // Domain purity: no statusCode field in the error instance
        expect((error as any).statusCode).toBeUndefined();
      }
    });

    it('should map 404 Not Found error codes correctly', () => {
      expect(mapDomainCodeToHttpStatus('POLICY_NOT_FOUND')).toBe(404);
      expect(mapDomainCodeToHttpStatus('VIOLATION_NOT_FOUND')).toBe(404);
      expect(mapDomainCodeToHttpStatus('EXEMPTION_NOT_FOUND')).toBe(404);

      expect(resolveHttpStatus(new PolicyNotFoundError('p1'))).toBe(404);
      expect(resolveHttpStatus(new ViolationNotFoundError('v1'))).toBe(404);
      expect(resolveHttpStatus(new ExemptionNotFoundError('e1'))).toBe(404);
    });

    it('should map 403 Forbidden error codes correctly', () => {
      expect(mapDomainCodeToHttpStatus('UNAUTHORIZED_VIOLATION_ACTION')).toBe(403);
      expect(mapDomainCodeToHttpStatus('UNAUTHORIZED_EXEMPTION_APPROVAL')).toBe(403);

      expect(resolveHttpStatus(new UnauthorizedViolationActionError('u1', 'resolve'))).toBe(403);
      expect(resolveHttpStatus(new UnauthorizedExemptionApprovalError('u1'))).toBe(403);
    });

    it('should map 409 Conflict error codes correctly', () => {
      expect(mapDomainCodeToHttpStatus('POLICY_NAME_EXISTS')).toBe(409);
      expect(mapDomainCodeToHttpStatus('POLICY_ALREADY_ACTIVE')).toBe(409);
      expect(mapDomainCodeToHttpStatus('POLICY_ALREADY_INACTIVE')).toBe(409);
      expect(mapDomainCodeToHttpStatus('VIOLATION_ALREADY_RESOLVED')).toBe(409);
      expect(mapDomainCodeToHttpStatus('EXEMPTION_ALREADY_PROCESSED')).toBe(409);

      expect(resolveHttpStatus(new PolicyNameAlreadyExistsError('Travel', 'ws1'))).toBe(409);
      expect(resolveHttpStatus(new PolicyAlreadyActiveError('p1'))).toBe(409);
      expect(resolveHttpStatus(new PolicyAlreadyInactiveError('p1'))).toBe(409);
      expect(resolveHttpStatus(new ViolationAlreadyResolvedError('v1'))).toBe(409);
      expect(resolveHttpStatus(new ExemptionAlreadyProcessedError('e1'))).toBe(409);
    });

    it('should map 400 Bad Request error codes correctly', () => {
      const badRequestCodes = [
        'INVALID_POLICY_CONFIGURATION',
        'POLICY_NAME_REQUIRED',
        'POLICY_NAME_TOO_LONG',
        'POLICY_DESCRIPTION_TOO_LONG',
        'INVALID_THRESHOLD',
        'INVALID_VIOLATION_TRANSITION',
        'EXEMPTION_EXPIRED',
        'INVALID_EXEMPTION_DATE_RANGE',
        'EXPENSE_BLOCKED_BY_POLICY',
        'INVALID_PRIORITY',
        'EXEMPTION_DURATION_EXCEEDED',
        'EXEMPTION_REASON_LENGTH_INVALID',
        'VIOLATION_NOTE_LENGTH_INVALID',
        'INVALID_POLICY_SCOPE',
      ];

      for (const code of badRequestCodes) {
        expect(mapDomainCodeToHttpStatus(code)).toBe(400);
      }

      expect(mapDomainCodeToHttpStatus('POLICY_EVALUATION_ERROR')).toBe(500);

      expect(resolveHttpStatus(new InvalidPolicyConfigurationError('err'))).toBe(400);
      expect(resolveHttpStatus(new PolicyNameRequiredError())).toBe(400);
      expect(resolveHttpStatus(new PolicyNameTooLongError(100))).toBe(400);
      expect(resolveHttpStatus(new PolicyDescriptionTooLongError(500))).toBe(400);
      expect(resolveHttpStatus(new InvalidThresholdError('neg'))).toBe(400);
      expect(resolveHttpStatus(new InvalidViolationTransitionError('A', 'B'))).toBe(400);
      expect(resolveHttpStatus(new ExemptionExpiredError('e1'))).toBe(400);
      expect(resolveHttpStatus(new InvalidExemptionDateRangeError())).toBe(400);
      expect(resolveHttpStatus(new ExpenseBlockedByPolicyError('x1', 'P1'))).toBe(400);
      expect(resolveHttpStatus(new PolicyEvaluationError('eval'))).toBe(500);
      expect(resolveHttpStatus(new InvalidPriorityError('prio'))).toBe(400);
      expect(resolveHttpStatus(new ExemptionDurationExceededError(365))).toBe(400);
      expect(resolveHttpStatus(new ExemptionReasonLengthError('len'))).toBe(400);
      expect(resolveHttpStatus(new ViolationNoteLengthError('len'))).toBe(400);
      expect(resolveHttpStatus(new InvalidScopeError('scope'))).toBe(400);
    });

    it('should sanitize POLICY_EVALUATION_ERROR in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        const mockReply: any = {
          statusCode: 0,
          payload: null,
          status(code: number) {
            this.statusCode = code;
            return this;
          },
          send(data: any) {
            this.payload = data;
            return this;
          },
        };

        const error = new PolicyEvaluationError('Database calculation failed internally');
        ResponseHelper.error(mockReply, error);

        expect(mockReply.statusCode).toBe(500);
        expect(mockReply.payload.error).toBe('Internal Server Error');
        expect(mockReply.payload.code).toBe('POLICY_EVALUATION_ERROR');
        expect(mockReply.payload.message).toBe('An unexpected error occurred');
        expect(mockReply.payload.message).not.toContain('Database calculation failed internally');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  // ==========================================================================
  // 4. Repositories
  // ==========================================================================
  describe('Repository Interfaces & Contracts', () => {
    const emptyPaginated = <T>() => ({
      items: [] as T[],
      total: 0,
      limit: 50,
      offset: 0,
      hasMore: false,
    });

    it('should verify IPolicyRepository contract structure', () => {
      const mockRepo: IPolicyRepository = {
        save: async () => {},
        findById: async () => null,
        findByWorkspace: async () => emptyPaginated(),
        findActiveByWorkspace: async () => emptyPaginated(),
        findAllActiveByWorkspace: async () => [],
        findByType: async () => emptyPaginated(),
        findByNameInWorkspace: async () => null,
        delete: async () => {},
        hasActiveReferences: async () => false,
      };

      expect(typeof mockRepo.save).toBe('function');
      expect(typeof mockRepo.findById).toBe('function');
      expect(typeof mockRepo.findByWorkspace).toBe('function');
      expect(typeof mockRepo.findActiveByWorkspace).toBe('function');
      expect(typeof mockRepo.findAllActiveByWorkspace).toBe('function');
      expect(typeof mockRepo.findByType).toBe('function');
      expect(typeof mockRepo.findByNameInWorkspace).toBe('function');
      expect(typeof mockRepo.delete).toBe('function');
      expect(typeof mockRepo.hasActiveReferences).toBe('function');
    });

    it('should verify IViolationRepository contract and filter structure', () => {
      const filters: ViolationFilters = {
        status: ViolationStatus.PENDING,
        severity: ViolationSeverity.HIGH,
        userId: 'u1',
        expenseId: 'e1',
        policyId: 'p1',
        startDate: new Date(),
        endDate: new Date(),
      };
      expect(filters.status).toBe(ViolationStatus.PENDING);

      const mockRepo: IViolationRepository = {
        save: async () => {},
        saveAll: async () => {},
        saveForExpense: async () => {},
        findById: async () => null,
        findByWorkspace: async () => emptyPaginated(),
        findByExpense: async () => [],
        findByUser: async () => emptyPaginated(),
        findPendingByWorkspace: async () => emptyPaginated(),
        countByWorkspace: async () => 0,
        getStats: async () => ({
          total: 0,
          byStatus: {
            [ViolationStatus.PENDING]: 0,
            [ViolationStatus.ACKNOWLEDGED]: 0,
            [ViolationStatus.RESOLVED]: 0,
            [ViolationStatus.EXEMPTED]: 0,
            [ViolationStatus.OVERRIDDEN]: 0,
          },
          bySeverity: {
            [ViolationSeverity.LOW]: 0,
            [ViolationSeverity.MEDIUM]: 0,
            [ViolationSeverity.HIGH]: 0,
            [ViolationSeverity.CRITICAL]: 0,
          },
        }),
        delete: async () => {},
        deleteByExpense: async () => {},
      };

      expect(typeof mockRepo.save).toBe('function');
      expect(typeof mockRepo.saveAll).toBe('function');
      expect(typeof mockRepo.saveForExpense).toBe('function');
      expect(typeof mockRepo.findById).toBe('function');
      expect(typeof mockRepo.findByWorkspace).toBe('function');
      expect(typeof mockRepo.findByExpense).toBe('function');
      expect(typeof mockRepo.findByUser).toBe('function');
      expect(typeof mockRepo.findPendingByWorkspace).toBe('function');
      expect(typeof mockRepo.countByWorkspace).toBe('function');
      expect(typeof mockRepo.delete).toBe('function');
      expect(typeof mockRepo.deleteByExpense).toBe('function');
    });

    it('should verify IExemptionRepository contract including batch loading findActiveForUserPolicies', () => {
      const filters: ExemptionFilters = {
        status: ExemptionStatus.APPROVED,
        userId: 'u1',
        policyId: 'p1',
        startDate: new Date(),
        endDate: new Date(),
      };
      expect(filters.status).toBe(ExemptionStatus.APPROVED);

      const mockRepo: IExemptionRepository = {
        save: async () => {},
        findById: async () => null,
        findByWorkspace: async () => emptyPaginated(),
        findByUser: async () => emptyPaginated(),
        findActiveForUser: async () => null,
        findActiveForUserPolicies: async () => new Map(),
        findPendingByWorkspace: async () => emptyPaginated(),
        expireExpiredBatch: async () => 0,
        countByWorkspace: async () => 0,
        delete: async () => {},
      };

      expect(typeof mockRepo.save).toBe('function');
      expect(typeof mockRepo.findById).toBe('function');
      expect(typeof mockRepo.findByWorkspace).toBe('function');
      expect(typeof mockRepo.findByUser).toBe('function');
      expect(typeof mockRepo.findActiveForUser).toBe('function');
      expect(typeof mockRepo.findActiveForUserPolicies).toBe('function');
      expect(typeof mockRepo.findPendingByWorkspace).toBe('function');
      expect(typeof mockRepo.expireExpiredBatch).toBe('function');
      expect(typeof mockRepo.countByWorkspace).toBe('function');
      expect(typeof mockRepo.delete).toBe('function');
    });
  });
});
