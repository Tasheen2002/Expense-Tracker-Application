import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import {
  CreatePolicyHandler,
  UpdatePolicyHandler,
  DeletePolicyHandler,
  ActivatePolicyHandler,
  DeactivatePolicyHandler,
  ApproveExemptionHandler,
  RejectExemptionHandler,
  RequestExemptionHandler,
  ExpireExemptionsHandler,
  AcknowledgeViolationHandler,
  ResolveViolationHandler,
  ExemptViolationHandler,
  OverrideViolationHandler,
  RecordViolationHandler,
  EvaluateExpenseHandler,
} from '../application/commands';
import { PolicyService } from '../application/services/policy.service';
import { ViolationService } from '../application/services/violation.service';
import { ExemptionService } from '../application/services/exemption.service';
import { PolicyEvaluationService } from '../application/services/policy-evaluation.service';
import { OperationService } from '@shared/services/operation.service';
import { PolicyType } from '../domain/enums/policy-type.enum';
import { ViolationSeverity } from '../domain/enums/violation-severity.enum';
import { ViolationStatus } from '../domain/enums/violation-status.enum';
import { ExemptionStatus } from '../domain/enums/exemption-status.enum';
import {
  PolicyNotFoundError,
  PolicyNameAlreadyExistsError,
  UnauthorizedViolationActionError,
} from '../domain/errors/policy-controls.errors';
import { UnauthorizedWorkspaceAccessError } from '@shared/errors/workspace-authorization.error';
import { IWorkspaceAuthorizationService } from '@shared/ports/workspace-authorization.port';
import { IExemptionRepository } from '../domain/repositories/exemption.repository';
import { ViolationId } from '../domain/value-objects';
import { WorkspaceId, UserId } from '@core/domain/value-objects';

describe('Policy Controls Commands Unit Tests', () => {
  const WS_ID = '11111111-1111-4111-8111-111111111111';
  const ADMIN_ID = '22222222-2222-4222-8222-222222222222';
  const USER_ID = '33333333-3333-4333-8333-333333333333';
  const OTHER_ID = '44444444-4444-4444-8444-444444444444';
  const POLICY_ID = '55555555-5555-4555-8555-555555555555';
  const VIOLATION_ID = '66666666-6666-4666-8666-666666666666';
  const EXEMPTION_ID = '77777777-7777-4777-8777-777777777777';
  const EXPENSE_ID = '88888888-8888-4888-8888-888888888888';

  const mockAuthService: { authorize: ReturnType<typeof vi.fn> } = {
    authorize: vi.fn(),
  };

  const operationService = new OperationService(
    mockAuthService as unknown as IWorkspaceAuthorizationService
  );

  const mockPolicyService = {
    createPolicy: vi.fn(),
    updatePolicy: vi.fn(),
    deletePolicy: vi.fn(),
    activatePolicy: vi.fn(),
    deactivatePolicy: vi.fn(),
  };

  const mockViolationService = {
    createViolation: vi.fn(),
    getViolationEntity: vi.fn(),
    acknowledgeViolation: vi.fn(),
    resolveViolation: vi.fn(),
    exemptViolation: vi.fn(),
    overrideViolation: vi.fn(),
  };

  const mockExemptionService = {
    requestExemption: vi.fn(),
    approveExemption: vi.fn(),
    rejectExemption: vi.fn(),
  };

  const mockExemptionRepository = {
    expireExpiredBatch: vi.fn(),
    findByWorkspace: vi.fn(),
    save: vi.fn(),
  };

  const mockEvaluationService = {
    evaluateExpense: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ALLOW_INSECURE_INTERNAL_AUTH = 'true';
    mockAuthService.authorize.mockResolvedValue({
      userId: ADMIN_ID,
      workspaceId: WS_ID,
      role: 'ADMIN',
    });
  });

  afterAll(() => {
    delete process.env.ALLOW_INSECURE_INTERNAL_AUTH;
  });

  // ============================================
  // 1. Policy Commands
  // ============================================

  describe('CreatePolicyHandler', () => {
    const handler = new CreatePolicyHandler(
      mockPolicyService as unknown as PolicyService,
      operationService
    );

    const input = {
      actorId: ADMIN_ID,
      workspaceId: WS_ID,
      name: 'Meals Policy',
      policyType: PolicyType.SPENDING_LIMIT,
      severity: ViolationSeverity.HIGH,
      configuration: { threshold: 50 },
    };

    it('should throw UnauthorizedWorkspaceAccessError when actor lacks admin role', async () => {
      mockAuthService.authorize.mockRejectedValueOnce(
        new UnauthorizedWorkspaceAccessError('Role ADMIN required')
      );
      await expect(handler.handle(input)).rejects.toThrow(
        UnauthorizedWorkspaceAccessError
      );
      expect(mockPolicyService.createPolicy).not.toHaveBeenCalled();
    });

    it('should propagate PolicyNameAlreadyExistsError domain error', async () => {
      mockPolicyService.createPolicy.mockRejectedValueOnce(
        new PolicyNameAlreadyExistsError('Meals Policy', WS_ID)
      );
      await expect(handler.handle(input)).rejects.toThrow(
        PolicyNameAlreadyExistsError
      );
    });

    it('should successfully create policy and return DTO', async () => {
      const mockResult = { id: POLICY_ID, name: 'Meals Policy' } as any;
      mockPolicyService.createPolicy.mockResolvedValueOnce(mockResult);

      const res = await handler.handle(input);
      expect(res.success).toBe(true);
      expect(res.data).toBe(mockResult);
      expect(mockPolicyService.createPolicy).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: WS_ID,
          name: 'Meals Policy',
          createdBy: ADMIN_ID,
        })
      );
    });
  });

  describe('UpdatePolicyHandler', () => {
    const handler = new UpdatePolicyHandler(
      mockPolicyService as unknown as PolicyService,
      operationService
    );

    const input = {
      actorId: ADMIN_ID,
      policyId: POLICY_ID,
      workspaceId: WS_ID,
      name: 'Updated Policy',
    };

    it('should require admin authorization', async () => {
      mockAuthService.authorize.mockRejectedValueOnce(
        new UnauthorizedWorkspaceAccessError('Access denied')
      );
      await expect(handler.handle(input)).rejects.toThrow(
        UnauthorizedWorkspaceAccessError
      );
    });

    it('should propagate PolicyNotFoundError', async () => {
      mockPolicyService.updatePolicy.mockRejectedValueOnce(
        new PolicyNotFoundError(POLICY_ID)
      );
      await expect(handler.handle(input)).rejects.toThrow(PolicyNotFoundError);
    });

    it('should successfully update policy', async () => {
      const mockResult = { id: POLICY_ID, name: 'Updated Policy' } as any;
      mockPolicyService.updatePolicy.mockResolvedValueOnce(mockResult);

      const res = await handler.handle(input);
      expect(res.success).toBe(true);
      expect(res.data).toBe(mockResult);
    });
  });

  describe('DeletePolicyHandler', () => {
    const handler = new DeletePolicyHandler(
      mockPolicyService as unknown as PolicyService,
      operationService
    );

    const input = {
      actorId: ADMIN_ID,
      policyId: POLICY_ID,
      workspaceId: WS_ID,
    };

    it('should require admin authorization', async () => {
      mockAuthService.authorize.mockRejectedValueOnce(
        new UnauthorizedWorkspaceAccessError('Access denied')
      );
      await expect(handler.handle(input)).rejects.toThrow(
        UnauthorizedWorkspaceAccessError
      );
    });

    it('should return void success result on delete', async () => {
      mockPolicyService.deletePolicy.mockResolvedValueOnce(undefined);

      const res = await handler.handle(input);
      expect(res.success).toBe(true);
      expect(mockPolicyService.deletePolicy).toHaveBeenCalledWith(POLICY_ID, WS_ID);
    });
  });

  describe('ActivatePolicyHandler', () => {
    const handler = new ActivatePolicyHandler(
      mockPolicyService as unknown as PolicyService,
      operationService
    );

    const input = {
      actorId: ADMIN_ID,
      policyId: POLICY_ID,
      workspaceId: WS_ID,
    };

    it('should require admin authorization', async () => {
      mockAuthService.authorize.mockRejectedValueOnce(
        new UnauthorizedWorkspaceAccessError('Access denied')
      );
      await expect(handler.handle(input)).rejects.toThrow(
        UnauthorizedWorkspaceAccessError
      );
    });

    it('should successfully activate policy', async () => {
      const mockResult = { id: POLICY_ID, isActive: true } as any;
      mockPolicyService.activatePolicy.mockResolvedValueOnce(mockResult);

      const res = await handler.handle(input);
      expect(res.success).toBe(true);
      expect(res.data).toBe(mockResult);
    });
  });

  describe('DeactivatePolicyHandler', () => {
    const handler = new DeactivatePolicyHandler(
      mockPolicyService as unknown as PolicyService,
      operationService
    );

    const input = {
      actorId: ADMIN_ID,
      policyId: POLICY_ID,
      workspaceId: WS_ID,
    };

    it('should require admin authorization', async () => {
      mockAuthService.authorize.mockRejectedValueOnce(
        new UnauthorizedWorkspaceAccessError('Access denied')
      );
      await expect(handler.handle(input)).rejects.toThrow(
        UnauthorizedWorkspaceAccessError
      );
    });

    it('should successfully deactivate policy', async () => {
      const mockResult = { id: POLICY_ID, isActive: false } as any;
      mockPolicyService.deactivatePolicy.mockResolvedValueOnce(mockResult);

      const res = await handler.handle(input);
      expect(res.success).toBe(true);
      expect(res.data).toBe(mockResult);
    });
  });

  // ============================================
  // 2. Exemption Commands
  // ============================================

  describe('RequestExemptionHandler', () => {
    const handler = new RequestExemptionHandler(
      mockExemptionService as unknown as ExemptionService,
      operationService
    );

    const input = {
      workspaceId: WS_ID,
      policyId: POLICY_ID,
      userId: USER_ID,
      actorId: USER_ID,
      reason: 'Travel exemption for conference',
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000),
    };

    it('should require workspace membership authorization', async () => {
      mockAuthService.authorize.mockRejectedValueOnce(
        new UnauthorizedWorkspaceAccessError('Not a workspace member')
      );
      await expect(handler.handle(input)).rejects.toThrow(
        UnauthorizedWorkspaceAccessError
      );
    });

    it('should reject non-admin requesting exemption on behalf of another user', async () => {
      mockAuthService.authorize.mockResolvedValueOnce({
        userId: OTHER_ID,
        workspaceId: WS_ID,
        role: 'MEMBER',
      });

      await expect(
        handler.handle({
          ...input,
          actorId: OTHER_ID,
          userId: USER_ID,
        })
      ).rejects.toThrow(
        /Only administrators or finance approvers can request policy exemptions on behalf of other users/
      );
    });

    it('should allow admin requesting exemption on behalf of another user', async () => {
      mockAuthService.authorize.mockResolvedValueOnce({
        userId: ADMIN_ID,
        workspaceId: WS_ID,
        role: 'ADMIN',
      });
      const mockResult = { id: EXEMPTION_ID, status: ExemptionStatus.PENDING } as any;
      mockExemptionService.requestExemption.mockResolvedValueOnce(mockResult);

      const res = await handler.handle({
        ...input,
        actorId: ADMIN_ID,
        userId: USER_ID,
      });
      expect(res.success).toBe(true);
      expect(mockExemptionService.requestExemption).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ID,
          requestedBy: ADMIN_ID,
        })
      );
    });

    it('should successfully request exemption for self', async () => {
      mockAuthService.authorize.mockResolvedValueOnce({
        userId: USER_ID,
        workspaceId: WS_ID,
        role: 'MEMBER',
      });
      const mockResult = { id: EXEMPTION_ID, status: ExemptionStatus.PENDING } as any;
      mockExemptionService.requestExemption.mockResolvedValueOnce(mockResult);

      const res = await handler.handle(input);
      expect(res.success).toBe(true);
      expect(res.data).toBe(mockResult);
    });
  });

  describe('ApproveExemptionHandler', () => {
    const handler = new ApproveExemptionHandler(
      mockExemptionService as unknown as ExemptionService,
      operationService
    );

    const input = {
      exemptionId: EXEMPTION_ID,
      workspaceId: WS_ID,
      actorId: ADMIN_ID,
    };

    it('should require admin authorization', async () => {
      mockAuthService.authorize.mockRejectedValueOnce(
        new UnauthorizedWorkspaceAccessError('Role ADMIN required')
      );
      await expect(handler.handle(input)).rejects.toThrow(
        UnauthorizedWorkspaceAccessError
      );
    });

    it('should successfully approve exemption with optional approvalNote', async () => {
      const mockResult = { id: EXEMPTION_ID, status: ExemptionStatus.APPROVED } as any;
      mockExemptionService.approveExemption.mockResolvedValueOnce(mockResult);

      const res = await handler.handle({
        ...input,
        approvalNote: 'Approved for urgent business travel',
      });
      expect(res.success).toBe(true);
      expect(res.data).toBe(mockResult);
      expect(mockExemptionService.approveExemption).toHaveBeenCalledWith(
        EXEMPTION_ID,
        WS_ID,
        ADMIN_ID,
        'Approved for urgent business travel'
      );
    });
  });

  describe('RejectExemptionHandler', () => {
    const handler = new RejectExemptionHandler(
      mockExemptionService as unknown as ExemptionService,
      operationService
    );

    const input = {
      exemptionId: EXEMPTION_ID,
      workspaceId: WS_ID,
      actorId: ADMIN_ID,
      rejectionReason: 'Not justified',
    };

    it('should require admin authorization', async () => {
      mockAuthService.authorize.mockRejectedValueOnce(
        new UnauthorizedWorkspaceAccessError('Role ADMIN required')
      );
      await expect(handler.handle(input)).rejects.toThrow(
        UnauthorizedWorkspaceAccessError
      );
    });

    it('should successfully reject exemption', async () => {
      const mockResult = { id: EXEMPTION_ID, status: ExemptionStatus.REJECTED } as any;
      mockExemptionService.rejectExemption.mockResolvedValueOnce(mockResult);

      const res = await handler.handle(input);
      expect(res.success).toBe(true);
      expect(res.data).toBe(mockResult);
    });
  });

  describe('ExpireExemptionsHandler', () => {
    const handler = new ExpireExemptionsHandler(
      mockExemptionRepository as unknown as IExemptionRepository,
      operationService
    );

    it('should throw UnauthorizedWorkspaceAccessError when neither actorId nor servicePrincipal is provided', async () => {
      await expect(
        handler.handle({ workspaceId: WS_ID })
      ).rejects.toThrow(
        /ExpireExemptions requires an authenticated actorId \(ADMIN\) or verified servicePrincipal/
      );
    });

    it('should require admin authorization when actorId is provided', async () => {
      mockAuthService.authorize.mockRejectedValueOnce(
        new UnauthorizedWorkspaceAccessError('Role ADMIN required')
      );
      await expect(
        handler.handle({ workspaceId: WS_ID, actorId: OTHER_ID })
      ).rejects.toThrow(UnauthorizedWorkspaceAccessError);
    });

    it('should authorize and process with verified servicePrincipal', async () => {
      mockExemptionRepository.expireExpiredBatch
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0);

      const res = await handler.handle({
        workspaceId: WS_ID,
        servicePrincipal: 'cron-worker',
      });
      expect(res.success).toBe(true);
      expect(mockExemptionRepository.expireExpiredBatch).toHaveBeenCalled();
    });
  });

  // ============================================
  // 3. Violation Commands & Ownership Enforcement
  // ============================================

  describe('AcknowledgeViolationHandler', () => {
    const handler = new AcknowledgeViolationHandler(
      mockViolationService as unknown as ViolationService,
      operationService
    );

    const mockViolation = {
      id: ViolationId.fromString(VIOLATION_ID),
      workspaceId: WorkspaceId.fromString(WS_ID),
      userId: UserId.fromString(USER_ID),
    };

    it('should throw UnauthorizedWorkspaceAccessError if actor not in workspace', async () => {
      mockAuthService.authorize.mockRejectedValueOnce(
        new UnauthorizedWorkspaceAccessError('Not a member')
      );
      await expect(
        handler.handle({
          violationId: VIOLATION_ID,
          workspaceId: WS_ID,
          actorId: OTHER_ID,
        })
      ).rejects.toThrow(UnauthorizedWorkspaceAccessError);
    });

    it('should throw UnauthorizedViolationActionError when actor is not owner and not elevated', async () => {
      mockAuthService.authorize.mockResolvedValueOnce({
        userId: OTHER_ID,
        workspaceId: WS_ID,
        role: 'MEMBER',
      });
      mockViolationService.getViolationEntity.mockResolvedValueOnce(mockViolation);

      await expect(
        handler.handle({
          violationId: VIOLATION_ID,
          workspaceId: WS_ID,
          actorId: OTHER_ID,
        })
      ).rejects.toThrow(UnauthorizedViolationActionError);

      expect(mockViolationService.acknowledgeViolation).not.toHaveBeenCalled();
    });

    it('should allow acknowledgment when actor is the violation owner', async () => {
      mockAuthService.authorize.mockResolvedValueOnce({
        userId: USER_ID,
        workspaceId: WS_ID,
        role: 'MEMBER',
      });
      mockViolationService.getViolationEntity.mockResolvedValueOnce(mockViolation);
      const mockResult = { id: VIOLATION_ID, status: ViolationStatus.ACKNOWLEDGED } as any;
      mockViolationService.acknowledgeViolation.mockResolvedValueOnce(mockResult);

      const res = await handler.handle({
        violationId: VIOLATION_ID,
        workspaceId: WS_ID,
        actorId: USER_ID,
      });

      expect(res.success).toBe(true);
      expect(mockViolationService.acknowledgeViolation).toHaveBeenCalledWith(
        VIOLATION_ID,
        WS_ID,
        USER_ID
      );
    });

    it('should allow acknowledgment when actor is ADMIN even if not owner', async () => {
      mockAuthService.authorize.mockResolvedValueOnce({
        userId: ADMIN_ID,
        workspaceId: WS_ID,
        role: 'ADMIN',
      });
      mockViolationService.getViolationEntity.mockResolvedValueOnce(mockViolation);
      const mockResult = { id: VIOLATION_ID, status: ViolationStatus.ACKNOWLEDGED } as any;
      mockViolationService.acknowledgeViolation.mockResolvedValueOnce(mockResult);

      const res = await handler.handle({
        violationId: VIOLATION_ID,
        workspaceId: WS_ID,
        actorId: ADMIN_ID,
      });

      expect(res.success).toBe(true);
      expect(mockViolationService.acknowledgeViolation).toHaveBeenCalledWith(
        VIOLATION_ID,
        WS_ID,
        ADMIN_ID
      );
    });

    it('should pass optional note to violationService.acknowledgeViolation when provided', async () => {
      mockAuthService.authorize.mockResolvedValueOnce({
        userId: USER_ID,
        workspaceId: WS_ID,
        role: 'MEMBER',
      });
      mockViolationService.getViolationEntity.mockResolvedValueOnce(mockViolation);
      const mockResult = { id: VIOLATION_ID, status: ViolationStatus.ACKNOWLEDGED } as any;
      mockViolationService.acknowledgeViolation.mockResolvedValueOnce(mockResult);

      const res = await handler.handle({
        violationId: VIOLATION_ID,
        workspaceId: WS_ID,
        actorId: USER_ID,
        note: 'Acknowledgment note from user',
      });

      expect(res.success).toBe(true);
      expect(mockViolationService.acknowledgeViolation).toHaveBeenCalledWith(
        VIOLATION_ID,
        WS_ID,
        USER_ID,
        'Acknowledgment note from user'
      );
    });
  });

  describe('ResolveViolationHandler', () => {
    const handler = new ResolveViolationHandler(
      mockViolationService as unknown as ViolationService,
      operationService
    );

    const input = {
      violationId: VIOLATION_ID,
      workspaceId: WS_ID,
      actorId: ADMIN_ID,
      resolutionNote: 'Approved exception after review',
    };

    it('should require admin authorization', async () => {
      mockAuthService.authorize.mockRejectedValueOnce(
        new UnauthorizedWorkspaceAccessError('Role ADMIN required')
      );
      await expect(handler.handle(input)).rejects.toThrow(
        UnauthorizedWorkspaceAccessError
      );
    });

    it('should successfully resolve violation', async () => {
      const mockResult = { id: VIOLATION_ID, status: ViolationStatus.RESOLVED } as any;
      mockViolationService.resolveViolation.mockResolvedValueOnce(mockResult);

      const res = await handler.handle(input);
      expect(res.success).toBe(true);
      expect(res.data).toBe(mockResult);
    });
  });

  describe('ExemptViolationHandler', () => {
    const handler = new ExemptViolationHandler(
      mockViolationService as unknown as ViolationService,
      operationService
    );

    const input = {
      violationId: VIOLATION_ID,
      workspaceId: WS_ID,
      actorId: ADMIN_ID,
      notes: 'Exemption granted',
      exemptionId: EXEMPTION_ID,
    };

    it('should require admin authorization', async () => {
      mockAuthService.authorize.mockRejectedValueOnce(
        new UnauthorizedWorkspaceAccessError('Role ADMIN required')
      );
      await expect(handler.handle(input)).rejects.toThrow(
        UnauthorizedWorkspaceAccessError
      );
    });

    it('should pass exemptionId to service and return success result', async () => {
      const mockResult = { id: VIOLATION_ID, status: ViolationStatus.EXEMPTED, exemptionId: EXEMPTION_ID } as any;
      mockViolationService.exemptViolation.mockResolvedValueOnce(mockResult);

      const res = await handler.handle(input);
      expect(res.success).toBe(true);
      expect(mockViolationService.exemptViolation).toHaveBeenCalledWith(
        VIOLATION_ID,
        WS_ID,
        ADMIN_ID,
        'Exemption granted',
        EXEMPTION_ID
      );
    });
  });

  describe('OverrideViolationHandler', () => {
    const handler = new OverrideViolationHandler(
      mockViolationService as unknown as ViolationService,
      operationService
    );

    const input = {
      violationId: VIOLATION_ID,
      workspaceId: WS_ID,
      actorId: ADMIN_ID,
      overrideReason: 'Business emergency override',
    };

    it('should require admin authorization', async () => {
      mockAuthService.authorize.mockRejectedValueOnce(
        new UnauthorizedWorkspaceAccessError('Role ADMIN required')
      );
      await expect(handler.handle(input)).rejects.toThrow(
        UnauthorizedWorkspaceAccessError
      );
    });

    it('should successfully override violation', async () => {
      const mockResult = { id: VIOLATION_ID, status: ViolationStatus.OVERRIDDEN } as any;
      mockViolationService.overrideViolation.mockResolvedValueOnce(mockResult);

      const res = await handler.handle(input);
      expect(res.success).toBe(true);
      expect(res.data).toBe(mockResult);
    });
  });

  describe('RecordViolationHandler', () => {
    const handler = new RecordViolationHandler(
      mockViolationService as unknown as ViolationService,
      operationService
    );

    const input = {
      actorId: ADMIN_ID,
      workspaceId: WS_ID,
      policyId: POLICY_ID,
      expenseId: EXPENSE_ID,
      userId: USER_ID,
      severity: ViolationSeverity.HIGH,
      violationDetails: 'Direct policy breach',
      expenseAmount: 150,
    };

    it('should throw UnauthorizedWorkspaceAccessError when neither actorId nor servicePrincipal is provided', async () => {
      const { actorId, ...withoutActor } = input;
      await expect(handler.handle(withoutActor as any)).rejects.toThrow(
        /RecordViolation requires an authenticated actorId \(ADMIN\) or verified servicePrincipal/
      );
    });

    it('should authorize with verified servicePrincipal', async () => {
      const mockResult = { id: VIOLATION_ID, status: ViolationStatus.PENDING } as any;
      mockViolationService.createViolation.mockResolvedValueOnce(mockResult);

      const { actorId, ...withoutActor } = input;
      const res = await handler.handle({
        ...withoutActor,
        servicePrincipal: 'expense-service',
      });
      expect(res.success).toBe(true);
      expect(mockViolationService.createViolation).toHaveBeenCalled();
    });

    it('should authorize actor when actorId is provided', async () => {
      mockAuthService.authorize.mockRejectedValueOnce(
        new UnauthorizedWorkspaceAccessError('Role ADMIN required')
      );
      await expect(handler.handle(input)).rejects.toThrow(
        UnauthorizedWorkspaceAccessError
      );
    });

    it('should successfully record violation', async () => {
      const mockResult = { id: VIOLATION_ID, status: ViolationStatus.PENDING } as any;
      mockViolationService.createViolation.mockResolvedValueOnce(mockResult);

      const res = await handler.handle(input);
      expect(res.success).toBe(true);
      expect(mockViolationService.createViolation).toHaveBeenCalledWith({
        workspaceId: WS_ID,
        policyId: POLICY_ID,
        expenseId: EXPENSE_ID,
        userId: USER_ID,
        severity: ViolationSeverity.HIGH,
        violationDetails: 'Direct policy breach',
        expenseAmount: 150,
        currency: undefined,
      });
    });
  });

  // ============================================
  // 4. Policy Evaluation Command
  // ============================================

  describe('EvaluateExpenseHandler', () => {
    const mockSnapshotService = {
      getExpenseSnapshot: vi.fn().mockImplementation(async (inp: any) => ({
        expenseId: inp.expenseId,
        workspaceId: inp.workspaceId,
        userId: inp.userId,
        amount: 250,
        currency: 'USD',
        hasReceipt: true,
        status: 'PENDING',
      })),
    };

    const handler = new EvaluateExpenseHandler(
      mockEvaluationService as unknown as PolicyEvaluationService,
      operationService,
      mockSnapshotService as any
    );

    const input = {
      workspaceId: WS_ID,
      expenseId: EXPENSE_ID,
      userId: USER_ID,
      amount: 250,
      currency: 'USD',
      hasReceipt: true,
      expenseDate: new Date(),
    };

    it('should throw UnauthorizedWorkspaceAccessError when neither actorId/userId nor servicePrincipal is provided', async () => {
      await expect(
        handler.handle({
          workspaceId: WS_ID,
          expenseId: EXPENSE_ID,
          userId: '',
          amount: 100,
          currency: 'USD',
          hasReceipt: true,
          expenseDate: new Date(),
        })
      ).rejects.toThrow(
        /EvaluateExpense requires an authenticated actorId \(or userId\) or verified servicePrincipal/
      );
    });

    it('should authorize with verified servicePrincipal', async () => {
      mockEvaluationService.evaluateExpense.mockResolvedValueOnce({
        passed: true,
        violations: [],
      });

      const res = await handler.handle({
        workspaceId: WS_ID,
        expenseId: EXPENSE_ID,
        userId: '',
        amount: 100,
        currency: 'USD',
        hasReceipt: true,
        expenseDate: new Date(),
        servicePrincipal: 'expense-service',
      });
      expect(res.success).toBe(true);
      expect(res.data?.passed).toBe(true);
    });

    it('should authorize workspace membership for actor', async () => {
      mockAuthService.authorize.mockRejectedValueOnce(
        new UnauthorizedWorkspaceAccessError('Not a member')
      );
      await expect(handler.handle(input)).rejects.toThrow(
        UnauthorizedWorkspaceAccessError
      );
    });

    it('should allow ordinary member to evaluate their own expense', async () => {
      mockAuthService.authorize.mockResolvedValueOnce({
        userId: USER_ID,
        workspaceId: WS_ID,
        role: 'MEMBER',
      });
      mockEvaluationService.evaluateExpense.mockResolvedValueOnce({
        passed: true,
        violations: [],
        requiresApproval: false,
        approvalRequiredPolicyIds: [],
      });

      const res = await handler.handle({
        ...input,
        actorId: USER_ID,
        userId: USER_ID,
      });
      expect(res.success).toBe(true);
      expect(res.data?.passed).toBe(true);
    });

    it('should throw UnauthorizedWorkspaceAccessError when ordinary member evaluates for another user', async () => {
      mockAuthService.authorize.mockResolvedValueOnce({
        userId: USER_ID,
        workspaceId: WS_ID,
        role: 'MEMBER',
      });

      await expect(
        handler.handle({
          ...input,
          actorId: USER_ID,
          userId: OTHER_ID,
        })
      ).rejects.toThrow(
        /Ordinary workspace members cannot evaluate expenses on behalf of another user/
      );
    });

    it('should allow elevated role (ADMIN/OWNER/FINANCE_APPROVER) to evaluate on behalf of another user', async () => {
      mockAuthService.authorize.mockResolvedValueOnce({
        userId: ADMIN_ID,
        workspaceId: WS_ID,
        role: 'ADMIN',
      });
      mockEvaluationService.evaluateExpense.mockResolvedValueOnce({
        passed: true,
        violations: [],
        requiresApproval: false,
        approvalRequiredPolicyIds: [],
      });

      const res = await handler.handle({
        ...input,
        actorId: ADMIN_ID,
        userId: USER_ID,
      });
      expect(res.success).toBe(true);
      expect(res.data?.passed).toBe(true);
    });

    it('should reject untrusted service principal with UnauthorizedWorkspaceAccessError', async () => {
      await expect(
        handler.handle({
          ...input,
          servicePrincipal: 'malicious-service',
        })
      ).rejects.toThrow(/Untrusted service principal: malicious-service/);
    });

    it('should reject service principal not authorized for mutating evaluation', async () => {
      await expect(
        handler.handle({
          ...input,
          servicePrincipal: 'cron-worker',
        })
      ).rejects.toThrow(/not authorized to execute mutating expense evaluations/);
    });

    it('should override caller-asserted amount, category, receipt, and role with snapshot and membership facts', async () => {
      const mockSnapshotService = {
        getExpenseSnapshot: vi.fn().mockResolvedValue({
          expenseId: EXPENSE_ID,
          workspaceId: WS_ID,
          userId: USER_ID,
          amount: 500, // authoritative amount
          currency: 'USD',
          categoryId: '00000000-0000-4000-8000-000000000001',
          hasReceipt: false, // authoritative hasReceipt
          status: 'PENDING',
        }),
      };

      const snapshotHandler = new EvaluateExpenseHandler(
        mockEvaluationService as unknown as PolicyEvaluationService,
        operationService,
        mockSnapshotService as any
      );

      mockAuthService.authorize.mockResolvedValueOnce({
        userId: USER_ID,
        workspaceId: WS_ID,
        role: 'MEMBER',
      });

      mockEvaluationService.evaluateExpense.mockResolvedValueOnce({
        passed: true,
        violations: [],
        requiresApproval: false,
        approvalRequiredPolicyIds: [],
      });

      // Caller attempts to claim $10, hasReceipt: true, and forged role: 'ADMIN'
      await snapshotHandler.handle({
        workspaceId: WS_ID,
        expenseId: EXPENSE_ID,
        userId: USER_ID,
        actorId: USER_ID,
        amount: 10,
        currency: 'USD',
        hasReceipt: true,
        userRole: 'ADMIN',
        expenseDate: new Date(),
      });

      expect(mockSnapshotService.getExpenseSnapshot).toHaveBeenCalledWith({
        workspaceId: WS_ID,
        expenseId: EXPENSE_ID,
        userId: USER_ID,
        authToken: undefined,
      });

      // Verify that evaluateExpense received authoritative snapshot values ($500, hasReceipt: false, role: 'MEMBER')
      expect(mockEvaluationService.evaluateExpense).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 500,
          hasReceipt: false,
          userRole: 'MEMBER',
          categoryId: '00000000-0000-4000-8000-000000000001',
        })
      );
    });
  });
});
