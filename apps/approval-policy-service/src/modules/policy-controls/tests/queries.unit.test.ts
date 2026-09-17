import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GetPolicyHandler,
  ListPoliciesHandler,
  GetViolationHandler,
  ListViolationsHandler,
  GetViolationStatsHandler,
  GetExemptionHandler,
  ListExemptionsHandler,
  CheckActiveExemptionHandler,
  CheckExpenseHandler,
} from '../application/queries';
import { PolicyService } from '../application/services/policy.service';
import { ViolationService } from '../application/services/violation.service';
import { ExemptionService } from '../application/services/exemption.service';
import { PolicyEvaluationService } from '../application/services/policy-evaluation.service';
import { OperationService } from '@shared/services/operation.service';
import { IWorkspaceAuthorizationService } from '@shared/ports/workspace-authorization.port';
import { UnauthorizedWorkspaceAccessError } from '@shared/errors/workspace-authorization.error';
import { UnauthorizedViolationActionError } from '../domain/errors/policy-controls.errors';
import { PolicyType } from '../domain/enums/policy-type.enum';
import { ViolationStatus } from '../domain/enums/violation-status.enum';
import { ExemptionStatus } from '../domain/enums/exemption-status.enum';

const WS_ID = '123e4567-e89b-12d3-a456-426614174000';
const USER_ID = '123e4567-e89b-12d3-a456-426614174001';
const OTHER_USER_ID = '123e4567-e89b-12d3-a456-426614174002';
const POLICY_ID = '123e4567-e89b-12d3-a456-426614174003';
const VIOLATION_ID = '123e4567-e89b-12d3-a456-426614174004';
const EXEMPTION_ID = '123e4567-e89b-12d3-a456-426614174005';

describe('Policy Controls Queries Unit Tests', () => {
  const mockAuthService: { authorize: ReturnType<typeof vi.fn> } = {
    authorize: vi.fn(),
  };

  const operationService = new OperationService(
    mockAuthService as unknown as IWorkspaceAuthorizationService
  );

  const mockPolicyService = {
    getPolicy: vi.fn(),
    listPolicies: vi.fn(),
  };

  const mockViolationService = {
    getViolation: vi.fn(),
    listViolations: vi.fn(),
    getStats: vi.fn(),
  };

  const mockExemptionService = {
    getExemption: vi.fn(),
    listExemptions: vi.fn(),
    checkActiveExemption: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthService.authorize.mockResolvedValue({
      userId: USER_ID,
      workspaceId: WS_ID,
      role: 'ADMIN',
    });
  });

  describe('GetPolicyHandler', () => {
    const handler = new GetPolicyHandler(
      mockPolicyService as unknown as PolicyService,
      operationService
    );

    it('should authorize and return policy', async () => {
      const mockPolicy = {
        id: POLICY_ID,
        name: 'Spending Limit',
        policyType: PolicyType.SPENDING_LIMIT,
      };
      mockPolicyService.getPolicy.mockResolvedValueOnce(mockPolicy);

      const result = await handler.handle({
        policyId: POLICY_ID,
        workspaceId: WS_ID,
        actorId: USER_ID,
      });

      expect(mockAuthService.authorize).toHaveBeenCalledWith(
        expect.objectContaining({ userId: USER_ID, workspaceId: WS_ID })
      );
      expect(result).toBe(mockPolicy);
    });

    it('should reject unauthorized user', async () => {
      mockAuthService.authorize.mockRejectedValueOnce(
        new UnauthorizedWorkspaceAccessError('Not a member')
      );

      await expect(
        handler.handle({
          policyId: POLICY_ID,
          workspaceId: WS_ID,
          actorId: USER_ID,
        })
      ).rejects.toThrow(UnauthorizedWorkspaceAccessError);
    });

    it('should throw UnauthorizedWorkspaceAccessError when actorId is missing', async () => {
      await expect(
        handler.handle({
          policyId: POLICY_ID,
          workspaceId: WS_ID,
          actorId: '' as any,
        })
      ).rejects.toThrow(UnauthorizedWorkspaceAccessError);
    });
  });

  describe('ListPoliciesHandler', () => {
    const handler = new ListPoliciesHandler(
      mockPolicyService as unknown as PolicyService,
      operationService
    );

    it('should authorize and return paginated policies', async () => {
      const mockResult = {
        items: [{ id: POLICY_ID }],
        total: 1,
        limit: 20,
        offset: 0,
        hasMore: false,
      };
      mockPolicyService.listPolicies.mockResolvedValueOnce(mockResult);

      const result = await handler.handle({
        workspaceId: WS_ID,
        actorId: USER_ID,
        activeOnly: true,
      });

      expect(result).toBe(mockResult);
    });
  });

  describe('GetViolationHandler', () => {
    const handler = new GetViolationHandler(
      mockViolationService as unknown as ViolationService,
      operationService
    );

    it('should allow admin to view any violation', async () => {
      mockAuthService.authorize.mockResolvedValueOnce({
        userId: USER_ID,
        workspaceId: WS_ID,
        role: 'ADMIN',
      });
      const mockViolation = {
        id: VIOLATION_ID,
        userId: OTHER_USER_ID,
        status: ViolationStatus.PENDING,
      };
      mockViolationService.getViolation.mockResolvedValueOnce(mockViolation);

      const result = await handler.handle({
        violationId: VIOLATION_ID,
        workspaceId: WS_ID,
        actorId: USER_ID,
      });

      expect(result).toBe(mockViolation);
    });

    it('should allow user to view their own violation', async () => {
      mockAuthService.authorize.mockResolvedValueOnce({
        userId: USER_ID,
        workspaceId: WS_ID,
        role: 'MEMBER',
      });
      const mockViolation = {
        id: VIOLATION_ID,
        userId: USER_ID,
        status: ViolationStatus.PENDING,
      };
      mockViolationService.getViolation.mockResolvedValueOnce(mockViolation);

      const result = await handler.handle({
        violationId: VIOLATION_ID,
        workspaceId: WS_ID,
        actorId: USER_ID,
      });

      expect(result).toBe(mockViolation);
    });

    it('should forbid member from viewing another user violation', async () => {
      mockAuthService.authorize.mockResolvedValueOnce({
        userId: USER_ID,
        workspaceId: WS_ID,
        role: 'MEMBER',
      });
      const mockViolation = {
        id: VIOLATION_ID,
        userId: OTHER_USER_ID,
        status: ViolationStatus.PENDING,
      };
      mockViolationService.getViolation.mockResolvedValueOnce(mockViolation);

      await expect(
        handler.handle({
          violationId: VIOLATION_ID,
          workspaceId: WS_ID,
          actorId: USER_ID,
        })
      ).rejects.toThrow(UnauthorizedViolationActionError);
    });
  });

  describe('ListViolationsHandler', () => {
    const handler = new ListViolationsHandler(
      mockViolationService as unknown as ViolationService,
      operationService
    );

    it('should scope list to user if actor is non-admin and no userId provided', async () => {
      mockAuthService.authorize.mockResolvedValueOnce({
        userId: USER_ID,
        workspaceId: WS_ID,
        role: 'MEMBER',
      });
      mockViolationService.listViolations.mockResolvedValueOnce({
        items: [],
        total: 0,
      });

      await handler.handle({
        workspaceId: WS_ID,
        actorId: USER_ID,
      });

      expect(mockViolationService.listViolations).toHaveBeenCalledWith(
        WS_ID,
        expect.objectContaining({
          userId: USER_ID,
        }),
        undefined
      );
    });

    it('should forbid non-admin from listing another user violations', async () => {
      mockAuthService.authorize.mockResolvedValueOnce({
        userId: USER_ID,
        workspaceId: WS_ID,
        role: 'MEMBER',
      });

      await expect(
        handler.handle({
          workspaceId: WS_ID,
          actorId: USER_ID,
          userId: OTHER_USER_ID,
        })
      ).rejects.toThrow(UnauthorizedViolationActionError);
    });

    it('should allow admin to filter by any userId', async () => {
      mockAuthService.authorize.mockResolvedValueOnce({
        userId: USER_ID,
        workspaceId: WS_ID,
        role: 'ADMIN',
      });
      mockViolationService.listViolations.mockResolvedValueOnce({
        items: [],
        total: 0,
      });

      await handler.handle({
        workspaceId: WS_ID,
        actorId: USER_ID,
        userId: OTHER_USER_ID,
      });

      expect(mockViolationService.listViolations).toHaveBeenCalledWith(
        WS_ID,
        expect.objectContaining({
          userId: OTHER_USER_ID,
        }),
        undefined
      );
    });
  });

  describe('GetViolationStatsHandler', () => {
    const handler = new GetViolationStatsHandler(
      mockViolationService as unknown as ViolationService,
      operationService
    );

    it('should reject non-elevated members for stats', async () => {
      mockAuthService.authorize.mockResolvedValueOnce({
        userId: USER_ID,
        workspaceId: WS_ID,
        role: 'MEMBER',
      });

      await expect(
        handler.handle({
          workspaceId: WS_ID,
          actorId: USER_ID,
        })
      ).rejects.toThrow(UnauthorizedViolationActionError);
    });

    it('should return violation statistics for authorized admin', async () => {
      mockAuthService.authorize.mockResolvedValueOnce({
        userId: USER_ID,
        workspaceId: WS_ID,
        role: 'ADMIN',
      });
      const mockStats = {
        total: 10,
        pendingCount: 3,
        resolvedCount: 7,
        byStatus: { [ViolationStatus.PENDING]: 3, [ViolationStatus.RESOLVED]: 7 } as any,
        bySeverity: {} as any,
      };
      mockViolationService.getStats.mockResolvedValueOnce(mockStats);

      const result = await handler.handle({
        workspaceId: WS_ID,
        actorId: USER_ID,
      });

      expect(result).toEqual(mockStats);
    });
  });

  describe('GetExemptionHandler', () => {
    const handler = new GetExemptionHandler(
      mockExemptionService as unknown as ExemptionService,
      operationService
    );

    it('should allow member to view their own exemption', async () => {
      mockAuthService.authorize.mockResolvedValueOnce({
        userId: USER_ID,
        workspaceId: WS_ID,
        role: 'MEMBER',
      });
      const mockExemption = {
        id: EXEMPTION_ID,
        userId: USER_ID,
        requestedBy: USER_ID,
        status: ExemptionStatus.APPROVED,
      };
      mockExemptionService.getExemption.mockResolvedValueOnce(mockExemption);

      const result = await handler.handle({
        exemptionId: EXEMPTION_ID,
        workspaceId: WS_ID,
        actorId: USER_ID,
      });

      expect(result).toBe(mockExemption);
    });

    it('should forbid member from viewing another user exemption', async () => {
      mockAuthService.authorize.mockResolvedValueOnce({
        userId: USER_ID,
        workspaceId: WS_ID,
        role: 'MEMBER',
      });
      const mockExemption = {
        id: EXEMPTION_ID,
        userId: OTHER_USER_ID,
        requestedBy: OTHER_USER_ID,
        status: ExemptionStatus.APPROVED,
      };
      mockExemptionService.getExemption.mockResolvedValueOnce(mockExemption);

      await expect(
        handler.handle({
          exemptionId: EXEMPTION_ID,
          workspaceId: WS_ID,
          actorId: USER_ID,
        })
      ).rejects.toThrow(UnauthorizedWorkspaceAccessError);
    });
  });

  describe('ListExemptionsHandler', () => {
    const handler = new ListExemptionsHandler(
      mockExemptionService as unknown as ExemptionService,
      operationService
    );

    it('should scope list to user if actor is non-admin and no userId provided', async () => {
      mockAuthService.authorize.mockResolvedValueOnce({
        userId: USER_ID,
        workspaceId: WS_ID,
        role: 'MEMBER',
      });
      mockExemptionService.listExemptions.mockResolvedValueOnce({
        items: [],
        total: 0,
      });

      await handler.handle({
        workspaceId: WS_ID,
        actorId: USER_ID,
      });

      expect(mockExemptionService.listExemptions).toHaveBeenCalledWith(
        WS_ID,
        expect.objectContaining({
          userId: USER_ID,
        }),
        undefined
      );
    });

    it('should forbid non-admin from listing another user exemptions', async () => {
      mockAuthService.authorize.mockResolvedValueOnce({
        userId: USER_ID,
        workspaceId: WS_ID,
        role: 'MEMBER',
      });

      await expect(
        handler.handle({
          workspaceId: WS_ID,
          actorId: USER_ID,
          userId: OTHER_USER_ID,
        })
      ).rejects.toThrow(UnauthorizedWorkspaceAccessError);
    });
  });

  describe('CheckActiveExemptionHandler', () => {
    const handler = new CheckActiveExemptionHandler(
      mockExemptionService as unknown as ExemptionService,
      operationService
    );

    it('should allow user to check their own active exemption', async () => {
      mockAuthService.authorize.mockResolvedValueOnce({
        userId: USER_ID,
        workspaceId: WS_ID,
        role: 'MEMBER',
      });
      mockExemptionService.checkActiveExemption.mockResolvedValueOnce(null);

      const result = await handler.handle({
        workspaceId: WS_ID,
        userId: USER_ID,
        policyId: POLICY_ID,
        actorId: USER_ID,
      });

      expect(result).toBeNull();
    });

    it('should forbid non-admin from checking another user active exemption', async () => {
      mockAuthService.authorize.mockResolvedValueOnce({
        userId: USER_ID,
        workspaceId: WS_ID,
        role: 'MEMBER',
      });

      await expect(
        handler.handle({
          workspaceId: WS_ID,
          userId: OTHER_USER_ID,
          policyId: POLICY_ID,
          actorId: USER_ID,
        })
      ).rejects.toThrow(UnauthorizedWorkspaceAccessError);
    });
  });

  // ============================================
  // Check Expense Query (Dry Run)
  // ============================================

  describe('CheckExpenseHandler', () => {
    const mockEvaluationService = {
      checkExpense: vi.fn(),
    };

    const handler = new CheckExpenseHandler(
      mockEvaluationService as unknown as PolicyEvaluationService,
      operationService
    );

    it('should throw UnauthorizedWorkspaceAccessError when actorId is missing', async () => {
      await expect(
        handler.handle({
          workspaceId: WS_ID,
          actorId: '',
          amount: 100,
          currency: 'USD',
        })
      ).rejects.toThrow(UnauthorizedWorkspaceAccessError);
    });

    it('should authorize membership, bind userRole from membership, and execute dry run', async () => {
      mockAuthService.authorize.mockResolvedValueOnce({
        userId: USER_ID,
        workspaceId: WS_ID,
        role: 'MEMBER',
      });

      mockEvaluationService.checkExpense.mockResolvedValueOnce({
        wouldPass: false,
        requiresApproval: true,
        approvalRequiredPolicyIds: [POLICY_ID],
        potentialViolations: [
          {
            policyName: 'Max Limit',
            policyType: PolicyType.SPENDING_LIMIT,
            severity: 'HIGH',
            details: 'Amount exceeds threshold',
          },
        ],
      });

      const res = await handler.handle({
        workspaceId: WS_ID,
        actorId: USER_ID,
        amount: 500,
        currency: 'USD',
        hasReceipt: false,
      });

      expect(res.wouldPass).toBe(false);
      expect(res.requiresApproval).toBe(true);
      expect(res.potentialViolations).toHaveLength(1);

      // Verify that userRole was bound strictly to membership.role ('MEMBER')
      expect(mockEvaluationService.checkExpense).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ID,
          amount: 500,
          currency: 'USD',
          userRole: 'MEMBER',
        })
      );
    });
  });
});
