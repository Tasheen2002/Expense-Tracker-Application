import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ViolationService } from '../application/services/violation.service';
import { ExpensePolicy } from '../domain/entities/expense-policy.entity';
import { PolicyViolation } from '../domain/entities/policy-violation.entity';
import { PolicyType } from '../domain/enums/policy-type.enum';
import { ViolationSeverity } from '../domain/enums/violation-severity.enum';
import { PolicyExemption } from '../domain/entities/policy-exemption.entity';
import {
  PolicyNotFoundError,
  ViolationNotFoundError,
  InvalidPolicyConfigurationError,
  InvalidExemptionForViolationError,
} from '../domain/errors/policy-controls.errors';
import { PolicyId } from '../domain/value-objects';
import { IExpenseSnapshotService } from '@shared/ports/expense-snapshot.port';

const validWorkspaceId = '11111111-1111-4111-a111-111111111111';
const validPolicyId = '22222222-2222-4222-a222-222222222222';
const validUserId = '33333333-3333-4333-a333-333333333333';
const validExpenseId = '44444444-4444-4444-a444-444444444444';
const validAdminId = '55555555-5555-4555-a555-555555555555';

describe('ViolationService', () => {
  let mockViolationRepo: any;
  let mockExemptionRepo: any;
  let mockPolicyRepo: any;
  let service: ViolationService;

  const mockPolicy = ExpensePolicy.create({
    workspaceId: validWorkspaceId,
    name: 'Strict Limit',
    policyType: PolicyType.SPENDING_LIMIT,
    severity: ViolationSeverity.CRITICAL,
    priority: 1,
    configuration: { threshold: 100, currency: 'USD' },
    createdBy: validAdminId,
  });

  beforeEach(() => {
    mockViolationRepo = {
      save: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn(),
      findByWorkspace: vi.fn(),
      findByExpenseId: vi.fn(),
      getStats: vi.fn(),
    };
    mockExemptionRepo = {
      findById: vi.fn(),
      save: vi.fn(),
    };
    mockPolicyRepo = {
      findById: vi.fn().mockImplementation(async (id: PolicyId) => {
        if (id.getValue() === validPolicyId || id.getValue() === mockPolicy.id.getValue()) {
          return mockPolicy;
        }
        return null;
      }),
    };

    service = new ViolationService(
      mockViolationRepo,
      mockExemptionRepo,
      mockPolicyRepo
    );
  });

  describe('createViolation', () => {
    it('should derive authoritative severity from policy when caller omits severity', async () => {
      const result = await service.createViolation({
        workspaceId: validWorkspaceId,
        policyId: mockPolicy.id.getValue(),
        expenseId: validExpenseId,
        userId: validUserId,
        violationDetails: 'Expense exceeded threshold',
        expenseAmount: 150,
        currency: 'USD',
      });

      expect(result.severity).toBe(ViolationSeverity.CRITICAL);
      expect(mockViolationRepo.save).toHaveBeenCalledTimes(1);
      const savedViolation: PolicyViolation = mockViolationRepo.save.mock.calls[0][0];
      expect(savedViolation.severity).toBe(ViolationSeverity.CRITICAL);
    });

    it('should accept caller-supplied severity when it matches policy severity', async () => {
      const result = await service.createViolation({
        workspaceId: validWorkspaceId,
        policyId: mockPolicy.id.getValue(),
        expenseId: validExpenseId,
        userId: validUserId,
        severity: ViolationSeverity.CRITICAL,
        violationDetails: 'Expense exceeded threshold',
        expenseAmount: 100,
      });

      expect(result.severity).toBe(ViolationSeverity.CRITICAL);
      expect(mockViolationRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should reject and throw InvalidPolicyConfigurationError when caller severity disagrees with policy', async () => {
      await expect(
        service.createViolation({
          workspaceId: validWorkspaceId,
          policyId: mockPolicy.id.getValue(),
          expenseId: validExpenseId,
          userId: validUserId,
          severity: ViolationSeverity.LOW, // Policy is CRITICAL!
          violationDetails: 'Attempting to downgrade severity',
          expenseAmount: 100,
        })
      ).rejects.toThrow(InvalidPolicyConfigurationError);

      expect(mockViolationRepo.save).not.toHaveBeenCalled();
    });

    it('should throw PolicyNotFoundError if policy does not exist', async () => {
      await expect(
        service.createViolation({
          workspaceId: validWorkspaceId,
          policyId: '99999999-9999-4999-a999-999999999998',
          expenseId: validExpenseId,
          userId: validUserId,
          violationDetails: 'Non-existent policy',
          expenseAmount: 100,
        })
      ).rejects.toThrow(PolicyNotFoundError);

      expect(mockViolationRepo.save).not.toHaveBeenCalled();
    });

    it('should throw PolicyNotFoundError if policy belongs to different workspace', async () => {
      await expect(
        service.createViolation({
          workspaceId: '99999999-9999-4999-a999-999999999999',
          policyId: mockPolicy.id.getValue(),
          expenseId: validExpenseId,
          userId: validUserId,
          violationDetails: 'Cross-workspace mismatch',
          expenseAmount: 100,
        })
      ).rejects.toThrow(PolicyNotFoundError);

      expect(mockViolationRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('getViolationEntity', () => {
    it('should return violation if found and workspace matches', async () => {
      const violation = PolicyViolation.create({
        workspaceId: validWorkspaceId,
        policyId: mockPolicy.id.getValue(),
        expenseId: validExpenseId,
        userId: validUserId,
        severity: ViolationSeverity.CRITICAL,
        violationDetails: 'Sample violation',
        expenseAmount: 100,
      });
      mockViolationRepo.findById.mockResolvedValueOnce(violation);

      const result = await service.getViolationEntity(
        violation.id.getValue(),
        validWorkspaceId
      );
      expect(result.id.getValue()).toBe(violation.id.getValue());
    });

    it('should throw ViolationNotFoundError if violation does not exist', async () => {
      mockViolationRepo.findById.mockResolvedValueOnce(null);

      await expect(
        service.getViolationEntity('88888888-8888-4888-a888-888888888888', validWorkspaceId)
      ).rejects.toThrow(ViolationNotFoundError);
    });

    it('should throw ViolationNotFoundError if workspace does not match', async () => {
      const violation = PolicyViolation.create({
        workspaceId: '99999999-9999-4999-a999-999999999999',
        policyId: mockPolicy.id.getValue(),
        expenseId: validExpenseId,
        userId: validUserId,
        severity: ViolationSeverity.CRITICAL,
        violationDetails: 'Other workspace violation',
        expenseAmount: 100,
      });
      mockViolationRepo.findById.mockResolvedValueOnce(violation);

      await expect(
        service.getViolationEntity(violation.id.getValue(), validWorkspaceId)
      ).rejects.toThrow(ViolationNotFoundError);
    });
  });

  describe('acknowledgeViolation', () => {
    it('should acknowledge violation with optional note and save to repository', async () => {
      const violation = PolicyViolation.create({
        workspaceId: validWorkspaceId,
        policyId: mockPolicy.id.getValue(),
        expenseId: validExpenseId,
        userId: validUserId,
        severity: ViolationSeverity.CRITICAL,
        violationDetails: 'Test violation',
        expenseAmount: 200,
        currency: 'USD',
      });
      mockViolationRepo.findById.mockResolvedValue(violation);

      const result = await service.acknowledgeViolation(
        violation.id.getValue(),
        validWorkspaceId,
        validUserId,
        'Acknowledged after receipt verification'
      );

      expect(result.status).toBe('ACKNOWLEDGED');
      expect(result.resolutionNotes).toBe('Acknowledged after receipt verification');
      expect(mockViolationRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('exemptViolation with scope enforcement', () => {
    const validCategoryId = '77777777-7777-4777-a777-777777777777';
    const otherCategoryId = '88888888-8888-4888-a888-888888888888';

    it('should require an exemptionId to exempt a violation', async () => {
      await expect(
        service.exemptViolation(
          '99999999-9999-4999-a999-999999999999',
          validWorkspaceId,
          validAdminId,
          'notes',
          '' // Empty exemptionId
        )
      ).rejects.toThrow(InvalidExemptionForViolationError);
    });

    it('should reject exemption when authoritative expense category is outside exemption scope', async () => {
      const violation = PolicyViolation.create({
        workspaceId: validWorkspaceId,
        policyId: mockPolicy.id.getValue(),
        expenseId: validExpenseId,
        userId: validUserId,
        severity: ViolationSeverity.CRITICAL,
        violationDetails: 'Scoped breach',
        expenseAmount: 200,
        currency: 'USD',
      });
      mockViolationRepo.findById.mockResolvedValue(violation);

      // Create an exemption scoped specifically to validCategoryId
      const exemption = PolicyExemption.create({
        workspaceId: validWorkspaceId,
        policyId: mockPolicy.id.getValue(),
        userId: validUserId,
        requestedBy: validUserId,
        reason: 'Client meetings',
        startDate: new Date(Date.now() - 10000),
        endDate: new Date(Date.now() + 100000),
        scope: { categoryIds: [validCategoryId], maxAmount: 500 },
      });
      exemption.approve(validAdminId, 'Approved');
      mockExemptionRepo.findById.mockResolvedValue(exemption);

      // Snapshot service returns authoritative category as otherCategoryId
      const mockSnapshotService: IExpenseSnapshotService = {
        getExpenseSnapshot: vi.fn().mockResolvedValue({
          expenseId: validExpenseId,
          workspaceId: validWorkspaceId,
          userId: validUserId,
          amount: 200,
          currency: 'USD',
          categoryId: otherCategoryId, // Outside scope!
          hasReceipt: true,
          expenseDate: new Date(),
          status: 'SUBMITTED',
        }),
      };

      const scopedService = new ViolationService(
        mockViolationRepo,
        mockExemptionRepo,
        mockPolicyRepo,
        mockSnapshotService
      );

      await expect(
        scopedService.exemptViolation(
          violation.id.getValue(),
          validWorkspaceId,
          validAdminId,
          'Attempted exemption',
          exemption.id.getValue()
        )
      ).rejects.toThrow(/outside approved scope/);
    });

    it('should successfully exempt violation when expense facts match exemption scope', async () => {
      const violation = PolicyViolation.create({
        workspaceId: validWorkspaceId,
        policyId: mockPolicy.id.getValue(),
        expenseId: validExpenseId,
        userId: validUserId,
        severity: ViolationSeverity.CRITICAL,
        violationDetails: 'Scoped breach',
        expenseAmount: 200,
        currency: 'USD',
      });
      mockViolationRepo.findById.mockResolvedValue(violation);

      const exemption = PolicyExemption.create({
        workspaceId: validWorkspaceId,
        policyId: mockPolicy.id.getValue(),
        userId: validUserId,
        requestedBy: validUserId,
        reason: 'Client dinner approved',
        startDate: new Date(Date.now() - 10000),
        endDate: new Date(Date.now() + 100000),
        scope: { categoryIds: [validCategoryId], maxAmount: 500 },
      });
      exemption.approve(validAdminId, 'Approved');
      mockExemptionRepo.findById.mockResolvedValue(exemption);

      const mockSnapshotService: IExpenseSnapshotService = {
        getExpenseSnapshot: vi.fn().mockResolvedValue({
          expenseId: validExpenseId,
          workspaceId: validWorkspaceId,
          userId: validUserId,
          amount: 200,
          currency: 'USD',
          categoryId: validCategoryId, // Matches scope!
          hasReceipt: true,
          expenseDate: new Date(),
          status: 'SUBMITTED',
        }),
      };

      const scopedService = new ViolationService(
        mockViolationRepo,
        mockExemptionRepo,
        mockPolicyRepo,
        mockSnapshotService
      );

      const result = await scopedService.exemptViolation(
        violation.id.getValue(),
        validWorkspaceId,
        validAdminId,
        'Applied valid exemption',
        exemption.id.getValue()
      );

      expect(result.status).toBe('EXEMPTED');
      expect(result.exemptionId).toBe(exemption.id.getValue());
      expect(mockViolationRepo.save).toHaveBeenCalled();
    });
  });
});
