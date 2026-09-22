import { describe, it, expect } from 'vitest';
import {
  workspaceParamsSchema,
  workflowParamsSchema,
  chainParamsSchema,
  paginationSchema,
  listChainsSchema,
  createChainSchema,
  updateChainSchema,
  initiateWorkflowSchema,
  approveStepSchema,
  rejectStepSchema,
  delegateStepSchema,
  cancelWorkflowSchema,
  approvalChainResponseSchema,
  approvalStepResponseSchema,
  workflowResponseSchema,
  workspaceParamsJsonSchema,
  chainParamsJsonSchema,
  workflowParamsJsonSchema,
  createChainBodyJsonSchema,
  updateChainBodyJsonSchema,
  listChainsQueryJsonSchema,
  initiateWorkflowBodyJsonSchema,
  approveStepBodyJsonSchema,
  rejectStepBodyJsonSchema,
  delegateStepBodyJsonSchema,
  paginationQueryJsonSchema,
} from '../infrastructure/http/validation/approval.schema';
import { toJsonSchema } from '../infrastructure/http/validation/validator';
import {
  DEFAULT_PAGE_LIMIT,
  MIN_PAGE_OFFSET,
  MAX_PAGE_LIMIT,
  APPROVAL_CHAIN_NAME_MAX_LENGTH,
  APPROVAL_CHAIN_DESCRIPTION_MAX_LENGTH,
  APPROVAL_COMMENTS_MAX_LENGTH,
  REJECTION_COMMENTS_MAX_LENGTH,
  MIN_APPROVAL_AMOUNT,
  MAX_APPROVAL_AMOUNT,
} from '../domain/constants';

describe('Validation Schemas (Unit)', () => {
  const validWorkspaceId = '123e4567-e89b-12d3-a456-426614174000';
  const validExpenseId = '223e4567-e89b-12d3-a456-426614174001';
  const validChainId = '323e4567-e89b-12d3-a456-426614174002';
  const validApproverId1 = '423e4567-e89b-12d3-a456-426614174003';
  const validApproverId2 = '523e4567-e89b-12d3-a456-426614174004';
  const validCategoryId = '623e4567-e89b-12d3-a456-426614174005';

  // ==========================================================================
  // PARAMS SCHEMAS
  // ==========================================================================
  describe('Params Schemas', () => {
    describe('workspaceParamsSchema', () => {
      it('should validate valid workspace UUID', () => {
        const result = workspaceParamsSchema.safeParse({ workspaceId: validWorkspaceId });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.workspaceId).toBe(validWorkspaceId);
        }
      });

      it('should reject non-UUID workspace ID', () => {
        const result = workspaceParamsSchema.safeParse({ workspaceId: 'not-a-uuid' });
        expect(result.success).toBe(false);
      });

      it('should reject missing workspaceId', () => {
        const result = workspaceParamsSchema.safeParse({});
        expect(result.success).toBe(false);
      });
    });

    describe('workflowParamsSchema', () => {
      it('should validate valid workspace and expense UUIDs', () => {
        const result = workflowParamsSchema.safeParse({
          workspaceId: validWorkspaceId,
          expenseId: validExpenseId,
        });
        expect(result.success).toBe(true);
      });

      it('should reject invalid expenseId format', () => {
        const result = workflowParamsSchema.safeParse({
          workspaceId: validWorkspaceId,
          expenseId: 'invalid-expense-id',
        });
        expect(result.success).toBe(false);
      });

      it('should reject missing expenseId', () => {
        const result = workflowParamsSchema.safeParse({
          workspaceId: validWorkspaceId,
        });
        expect(result.success).toBe(false);
      });
    });

    describe('chainParamsSchema', () => {
      it('should validate valid workspace and chain UUIDs', () => {
        const result = chainParamsSchema.safeParse({
          workspaceId: validWorkspaceId,
          chainId: validChainId,
        });
        expect(result.success).toBe(true);
      });

      it('should reject invalid chainId format', () => {
        const result = chainParamsSchema.safeParse({
          workspaceId: validWorkspaceId,
          chainId: 'invalid-chain-id',
        });
        expect(result.success).toBe(false);
      });
    });
  });

  // ==========================================================================
  // QUERY / PAGINATION SCHEMAS
  // ==========================================================================
  describe('Pagination & Query Schemas', () => {
    describe('paginationSchema', () => {
      it('should apply defaults when limit and offset are omitted', () => {
        const result = paginationSchema.parse({});
        expect(result.limit).toBe(DEFAULT_PAGE_LIMIT);
        expect(result.offset).toBe(MIN_PAGE_OFFSET);
      });

      it('should coerce string numbers into integer primitives', () => {
        const result = paginationSchema.parse({ limit: '20', offset: '40' });
        expect(result.limit).toBe(20);
        expect(result.offset).toBe(40);
      });

      it('should reject limit below 1', () => {
        const result = paginationSchema.safeParse({ limit: 0 });
        expect(result.success).toBe(false);
      });

      it('should reject limit exceeding MAX_PAGE_LIMIT (100)', () => {
        const result = paginationSchema.safeParse({ limit: MAX_PAGE_LIMIT + 1 });
        expect(result.success).toBe(false);
      });

      it('should reject negative offset', () => {
        const result = paginationSchema.safeParse({ offset: -1 });
        expect(result.success).toBe(false);
      });

      it('should reject non-integer float values', () => {
        expect(paginationSchema.safeParse({ limit: 10.5 }).success).toBe(false);
        expect(paginationSchema.safeParse({ offset: 2.7 }).success).toBe(false);
      });
    });

    describe('listChainsSchema', () => {
      it('should default activeOnly to false when omitted', () => {
        const result = listChainsSchema.parse({});
        expect(result.activeOnly).toBe(false);
        expect(result.limit).toBe(DEFAULT_PAGE_LIMIT);
        expect(result.offset).toBe(MIN_PAGE_OFFSET);
      });

      it('should parse boolean activeOnly true and false', () => {
        expect(listChainsSchema.parse({ activeOnly: true }).activeOnly).toBe(true);
        expect(listChainsSchema.parse({ activeOnly: false }).activeOnly).toBe(false);
      });

      it('should transform string "true" and "false" into booleans', () => {
        expect(listChainsSchema.parse({ activeOnly: 'true' }).activeOnly).toBe(true);
        expect(listChainsSchema.parse({ activeOnly: 'false' }).activeOnly).toBe(false);
      });

      it('should reject arbitrary non-boolean strings for activeOnly', () => {
        expect(listChainsSchema.safeParse({ activeOnly: 'yes' }).success).toBe(false);
        expect(listChainsSchema.safeParse({ activeOnly: 1 }).success).toBe(false);
      });
    });
  });

  // ==========================================================================
  // APPROVAL CHAIN SCHEMAS
  // ==========================================================================
  describe('Approval Chain Validation Schemas', () => {
    describe('createChainSchema', () => {
      const validCreatePayload = {
        name: 'Standard Finance Approval',
        description: 'Multi-level approval chain for expenses',
        minAmount: 50,
        maxAmount: 5000,
        categoryIds: [validCategoryId],
        requiresReceipt: true,
        approverSequence: [validApproverId1, validApproverId2],
      };

      it('should validate complete valid approval chain payload', () => {
        const result = createChainSchema.safeParse(validCreatePayload);
        expect(result.success).toBe(true);
      });

      it('should trim name and description whitespace', () => {
        const result = createChainSchema.parse({
          ...validCreatePayload,
          name: '   Executive Chain   ',
          description: '   Description with extra spacing   ',
        });
        expect(result.name).toBe('Executive Chain');
        expect(result.description).toBe('Description with extra spacing');
      });

      it('should reject empty or whitespace-only name', () => {
        expect(createChainSchema.safeParse({ ...validCreatePayload, name: '' }).success).toBe(false);
        expect(createChainSchema.safeParse({ ...validCreatePayload, name: '   ' }).success).toBe(false);
      });

      it('should reject name exceeding maximum characters', () => {
        const longName = 'a'.repeat(APPROVAL_CHAIN_NAME_MAX_LENGTH + 1);
        const result = createChainSchema.safeParse({ ...validCreatePayload, name: longName });
        expect(result.success).toBe(false);
      });

      it('should reject description exceeding maximum characters', () => {
        const longDesc = 'a'.repeat(APPROVAL_CHAIN_DESCRIPTION_MAX_LENGTH + 1);
        const result = createChainSchema.safeParse({ ...validCreatePayload, description: longDesc });
        expect(result.success).toBe(false);
      });

      it('should reject when minAmount is greater than maxAmount', () => {
        const result = createChainSchema.safeParse({
          ...validCreatePayload,
          minAmount: 1000,
          maxAmount: 500,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Minimum amount cannot be greater than maximum amount');
        }
      });

      it('should accept when minAmount equals maxAmount', () => {
        const result = createChainSchema.safeParse({
          ...validCreatePayload,
          minAmount: 500,
          maxAmount: 500,
        });
        expect(result.success).toBe(true);
      });

      it('should reject amount values out of bounds', () => {
        expect(createChainSchema.safeParse({ ...validCreatePayload, minAmount: MIN_APPROVAL_AMOUNT - 1 }).success).toBe(false);
        expect(createChainSchema.safeParse({ ...validCreatePayload, maxAmount: MAX_APPROVAL_AMOUNT + 1 }).success).toBe(false);
      });

      it('should reject empty approverSequence', () => {
        const result = createChainSchema.safeParse({
          ...validCreatePayload,
          approverSequence: [],
        });
        expect(result.success).toBe(false);
      });

      it('should reject duplicate approvers in approverSequence', () => {
        const result = createChainSchema.safeParse({
          ...validCreatePayload,
          approverSequence: [validApproverId1, validApproverId1],
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('duplicate approvers');
        }
      });

      it('should reject case-insensitive duplicate approvers in approverSequence', () => {
        const uppercaseApprover = validApproverId1.toUpperCase();
        const result = createChainSchema.safeParse({
          ...validCreatePayload,
          approverSequence: [validApproverId1, uppercaseApprover],
        });
        expect(result.success).toBe(false);
      });

      it('should reject approverSequence exceeding maximum approvers (10)', () => {
        const elevenApprovers = Array.from({ length: 11 }, (_, i) =>
          `123e4567-e89b-12d3-a456-${String(i).padStart(12, '0')}`
        );
        const result = createChainSchema.safeParse({
          ...validCreatePayload,
          approverSequence: elevenApprovers,
        });
        expect(result.success).toBe(false);
      });

      it('should reject invalid UUIDs in categoryIds', () => {
        const result = createChainSchema.safeParse({
          ...validCreatePayload,
          categoryIds: ['not-a-category-uuid'],
        });
        expect(result.success).toBe(false);
      });
    });

    describe('updateChainSchema', () => {
      it('should reject empty object for partial updates', () => {
        const result = updateChainSchema.safeParse({});
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0]?.message).toBe(
            'At least one field must be provided for update'
          );
        }
      });

      it('should validate individual field updates', () => {
        expect(updateChainSchema.safeParse({ name: 'Updated Chain' }).success).toBe(true);
        expect(updateChainSchema.safeParse({ requiresReceipt: false }).success).toBe(true);
        expect(updateChainSchema.safeParse({ approverSequence: [validApproverId1] }).success).toBe(true);
      });

      it('should allow clearing nullable fields with null', () => {
        const result = updateChainSchema.safeParse({
          description: null,
          minAmount: null,
          maxAmount: null,
        });
        expect(result.success).toBe(true);
      });

      it('should reject empty or whitespace name if provided', () => {
        expect(updateChainSchema.safeParse({ name: '' }).success).toBe(false);
        expect(updateChainSchema.safeParse({ name: '   ' }).success).toBe(false);
      });

      it('should reject minAmount greater than maxAmount when both provided', () => {
        const result = updateChainSchema.safeParse({
          minAmount: 1000,
          maxAmount: 200,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Minimum amount cannot be greater than maximum amount');
        }
      });

      it('should allow setting minAmount when maxAmount is omitted or null', () => {
        expect(updateChainSchema.safeParse({ minAmount: 1000 }).success).toBe(true);
        expect(updateChainSchema.safeParse({ minAmount: 1000, maxAmount: null }).success).toBe(true);
      });

      it('should reject duplicate approvers in approverSequence if provided', () => {
        const result = updateChainSchema.safeParse({
          approverSequence: [validApproverId1, validApproverId1],
        });
        expect(result.success).toBe(false);
      });
    });
  });

  // ==========================================================================
  // WORKFLOW SCHEMAS
  // ==========================================================================
  describe('Workflow Validation Schemas', () => {
    describe('initiateWorkflowSchema', () => {
      const validInitiatePayload = {
        expenseId: validExpenseId,
      };

      it('should validate valid workflow initiation payload', () => {
        const result = initiateWorkflowSchema.safeParse(validInitiatePayload);
        expect(result.success).toBe(true);
      });

      it('should reject invalid expenseId format', () => {
        const result = initiateWorkflowSchema.safeParse({
          expenseId: 'invalid-expense-uuid',
        });
        expect(result.success).toBe(false);
      });

      it('should reject missing expenseId', () => {
        const result = initiateWorkflowSchema.safeParse({});
        expect(result.success).toBe(false);
      });
    });

    describe('approveStepSchema', () => {
      it('should validate approval with required expectedStepNumber and comments', () => {
        const result = approveStepSchema.safeParse({
          expectedStepNumber: 1,
          comments: 'Approved per company policy',
        });
        expect(result.success).toBe(true);
      });

      it('should allow omitting comments', () => {
        const result = approveStepSchema.safeParse({
          expectedStepNumber: 2,
        });
        expect(result.success).toBe(true);
      });

      it('should trim comments', () => {
        const result = approveStepSchema.parse({
          expectedStepNumber: 1,
          comments: '   Looks fine   ',
        });
        expect(result.comments).toBe('Looks fine');
      });

      it('should reject missing expectedStepNumber', () => {
        const result = approveStepSchema.safeParse({
          comments: 'Approved',
        });
        expect(result.success).toBe(false);
      });

      it('should reject non-positive or non-integer expectedStepNumber', () => {
        expect(approveStepSchema.safeParse({ expectedStepNumber: 0 }).success).toBe(false);
        expect(approveStepSchema.safeParse({ expectedStepNumber: -1 }).success).toBe(false);
        expect(approveStepSchema.safeParse({ expectedStepNumber: 1.5 }).success).toBe(false);
      });

      it('should reject comments exceeding maximum length', () => {
        const longComment = 'a'.repeat(APPROVAL_COMMENTS_MAX_LENGTH + 1);
        const result = approveStepSchema.safeParse({
          expectedStepNumber: 1,
          comments: longComment,
        });
        expect(result.success).toBe(false);
      });
    });

    describe('rejectStepSchema', () => {
      it('should validate rejection with valid comments', () => {
        const result = rejectStepSchema.safeParse({
          comments: 'Missing itemized receipt',
        });
        expect(result.success).toBe(true);
      });

      it('should trim comments', () => {
        const result = rejectStepSchema.parse({
          comments: '   Policy violation   ',
        });
        expect(result.comments).toBe('Policy violation');
      });

      it('should reject empty or whitespace-only comments', () => {
        expect(rejectStepSchema.safeParse({ comments: '' }).success).toBe(false);
        expect(rejectStepSchema.safeParse({ comments: '   ' }).success).toBe(false);
      });

      it('should reject missing comments', () => {
        expect(rejectStepSchema.safeParse({}).success).toBe(false);
      });

      it('should reject comments exceeding maximum length', () => {
        const longComment = 'a'.repeat(REJECTION_COMMENTS_MAX_LENGTH + 1);
        const result = rejectStepSchema.safeParse({ comments: longComment });
        expect(result.success).toBe(false);
      });
    });

    describe('delegateStepSchema', () => {
      it('should validate valid toUserId UUID', () => {
        const result = delegateStepSchema.safeParse({
          toUserId: validApproverId1,
        });
        expect(result.success).toBe(true);
      });

      it('should reject non-UUID toUserId', () => {
        const result = delegateStepSchema.safeParse({
          toUserId: 'not-a-user-uuid',
        });
        expect(result.success).toBe(false);
      });

      it('should reject missing toUserId', () => {
        const result = delegateStepSchema.safeParse({});
        expect(result.success).toBe(false);
      });
    });

    describe('cancelWorkflowSchema', () => {
      it('should accept undefined or empty object for cancellation', () => {
        expect(cancelWorkflowSchema.safeParse(undefined).success).toBe(true);
        expect(cancelWorkflowSchema.safeParse({}).success).toBe(true);
      });

      it('should validate cancellation with a valid reason', () => {
        const result = cancelWorkflowSchema.safeParse({
          reason: 'Expense created in error',
        });
        expect(result.success).toBe(true);
        if (result.success && result.data) {
          expect(result.data.reason).toBe('Expense created in error');
        }
      });

      it('should trim reason whitespace', () => {
        const result = cancelWorkflowSchema.parse({
          reason: '   Duplicate submission   ',
        });
        expect(result?.reason).toBe('Duplicate submission');
      });

      it('should reject cancellation reason exceeding maximum length', () => {
        const longReason = 'a'.repeat(APPROVAL_COMMENTS_MAX_LENGTH + 1);
        const result = cancelWorkflowSchema.safeParse({ reason: longReason });
        expect(result.success).toBe(false);
      });
    });
  });

  // ==========================================================================
  // RESPONSE SCHEMAS (DTO PARITY)
  // ==========================================================================
  describe('Response Schemas', () => {
    it('should validate complete approvalChainResponseSchema', () => {
      const chainDto = {
        chainId: validChainId,
        workspaceId: validWorkspaceId,
        name: 'Finance Chain',
        description: 'Standard chain',
        minAmount: 100,
        maxAmount: 10000,
        categoryIds: [validCategoryId],
        requiresReceipt: true,
        approverSequence: [validApproverId1, validApproverId2],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const result = approvalChainResponseSchema.safeParse(chainDto);
      expect(result.success).toBe(true);
    });

    it('should validate complete approvalStepResponseSchema', () => {
      const stepDto = {
        stepId: '723e4567-e89b-12d3-a456-426614174006',
        workflowId: '823e4567-e89b-12d3-a456-426614174007',
        stepNumber: 1,
        approverId: validApproverId1,
        delegatedTo: null,
        status: 'PENDING',
        comments: null,
        processedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const result = approvalStepResponseSchema.safeParse(stepDto);
      expect(result.success).toBe(true);
    });

    it('should validate complete workflowResponseSchema including version field', () => {
      const workflowDto = {
        workflowId: '823e4567-e89b-12d3-a456-426614174007',
        expenseId: validExpenseId,
        workspaceId: validWorkspaceId,
        userId: '923e4567-e89b-12d3-a456-426614174008',
        chainId: validChainId,
        status: 'IN_PROGRESS',
        currentStepNumber: 1,
        version: 2,
        steps: [
          {
            stepId: '723e4567-e89b-12d3-a456-426614174006',
            workflowId: '823e4567-e89b-12d3-a456-426614174007',
            stepNumber: 1,
            approverId: validApproverId1,
            delegatedTo: null,
            status: 'PENDING',
            comments: null,
            processedAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
      };
      const result = workflowResponseSchema.safeParse(workflowDto);
      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // JSON SCHEMA UTILITY & PRE-COMPUTED SCHEMAS
  // ==========================================================================
  describe('JSON Schema Utility and Pre-Computed Schemas', () => {
    it('should convert Zod schema to JSON Schema (draft-7) object', () => {
      const jsonSchema = toJsonSchema(initiateWorkflowSchema) as {
        type?: string;
        properties?: Record<string, unknown>;
      };
      expect(jsonSchema).toBeDefined();
      expect(jsonSchema.type).toBe('object');
      expect(jsonSchema.properties).toHaveProperty('expenseId');
      expect(jsonSchema.properties).not.toHaveProperty('amount');
      expect(jsonSchema.properties).not.toHaveProperty('hasReceipt');
    });

    it('should verify all pre-computed JSON Schemas are valid objects', () => {
      const schemas = [
        workspaceParamsJsonSchema,
        chainParamsJsonSchema,
        workflowParamsJsonSchema,
        createChainBodyJsonSchema,
        updateChainBodyJsonSchema,
        listChainsQueryJsonSchema,
        initiateWorkflowBodyJsonSchema,
        approveStepBodyJsonSchema,
        rejectStepBodyJsonSchema,
        delegateStepBodyJsonSchema,
        paginationQueryJsonSchema,
      ];

      for (const schema of schemas) {
        expect(typeof schema).toBe('object');
        expect(schema).not.toBeNull();
      }
    });
  });
});
