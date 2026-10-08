import { PrismaRuleEvaluationAdapter } from '../infrastructure/adapters/prisma-rule-evaluation.adapter';
import { randomUUID } from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  WorkspaceId,
  UserId,
  CategoryId,
  ExpenseId,
} from '@core/domain/value-objects';
import { CategoryRule } from '../domain/entities/category-rule.entity';
import { CategorySuggestion } from '../domain/entities/category-suggestion.entity';
import { RuleExecution } from '../domain/entities/rule-execution.entity';
import { RuleCondition } from '../domain/value-objects/rule-condition';
import { RuleConditionType } from '../domain/enums/rule-condition-type';
import { ConfidenceScore } from '../domain/value-objects/confidence-score';
import { PrismaCategoryRuleRepository } from '../infrastructure/persistence/category-rule.repository.impl';
import { PrismaCategorySuggestionRepository } from '../infrastructure/persistence/category-suggestion.repository.impl';
import { PrismaRuleExecutionRepository } from '../infrastructure/persistence/rule-execution.repository.impl';
import {
  DuplicateRuleNameError,
  RuleWriteConflictError,
  SuggestionNotFoundError,
} from '../domain/errors/categorization-rules.errors';
import { CategorySuggestionService } from '../application/services/category-suggestion.service';
import { RuleExecutionService } from '../application/services/rule-execution.service';
import {
  GetSuggestionsByExpenseHandler,
  GetExecutionsByExpenseHandler,
} from '../application/queries';

const url = process.env.CATEGORIZATION_TEST_DATABASE_URL;
// Dedicated database only: these tests intentionally install a failing outbox trigger.
describe.skipIf(!url)('Categorization PostgreSQL foundation', () => {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const rules = new PrismaCategoryRuleRepository(prisma);
  const suggestions = new PrismaCategorySuggestionRepository(prisma);
  const executions = new PrismaRuleExecutionRepository(prisma);
  const evaluationWriter = new PrismaRuleEvaluationAdapter(prisma);
  const workspaceId = WorkspaceId.fromString(randomUUID());
  function rule(name = randomUUID()) {
    return CategoryRule.create({
      workspaceId,
      name,
      createdBy: UserId.fromString(randomUUID()),
      targetCategoryId: CategoryId.fromString(randomUUID()),
      condition: RuleCondition.create(
        RuleConditionType.MERCHANT_CONTAINS,
        'shop'
      ),
    });
  }
  function suggestion(categoryId = CategoryId.fromString(randomUUID())) {
    return CategorySuggestion.create({
      expenseOwnerId: UserId.fromString(randomUUID()),
      workspaceId,
      expenseId: ExpenseId.fromString(randomUUID()),
      suggestedCategoryId: categoryId,
      confidence: ConfidenceScore.high(),
    });
  }
  async function failOutbox() {
    await prisma.$executeRawUnsafe(
      `CREATE FUNCTION categorization_rules.fail_test_outbox() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected outbox failure'; END $$`
    );
    await prisma.$executeRawUnsafe(
      'CREATE TRIGGER fail_test_outbox BEFORE INSERT ON categorization_rules.outbox_event FOR EACH ROW EXECUTE FUNCTION categorization_rules.fail_test_outbox()'
    );
  }
  async function resetFailure() {
    await prisma.$executeRawUnsafe(
      'DROP TRIGGER IF EXISTS fail_test_outbox ON categorization_rules.outbox_event'
    );
    await prisma.$executeRawUnsafe(
      'DROP FUNCTION IF EXISTS categorization_rules.fail_test_outbox()'
    );
  }
  beforeAll(async () => {
    const [{ name }] = await prisma.$queryRaw<
      Array<{ name: string }>
    >`SELECT current_database() AS name`;
    if (!name.startsWith('codex_test_categorization_'))
      throw new Error(
        'A dedicated codex_test_categorization_ database is required'
      );
  });
  afterEach(resetFailure);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('rejects concurrent stale rule writes and keeps their events pending', async () => {
    const saved = rule();
    await rules.save(saved);
    const first = (await rules.findById(saved.id, workspaceId))!;
    const second = (await rules.findById(saved.id, workspaceId))!;
    first.updateDetails({ name: randomUUID() });
    second.updateDetails({ description: 'stale update' });
    await rules.save(first);
    expect(first.version).toBe(2);
    await expect(rules.save(second)).rejects.toBeInstanceOf(
      RuleWriteConflictError
    );
    expect(second.version).toBe(1);
    expect(second.domainEvents).toHaveLength(1);
    const stored = (await rules.findById(saved.id, workspaceId))!;
    expect(stored.name).toBe(first.name);
    expect(stored.description).toBeNull();
  });

  it('allows exactly one competing update across independent service instances', async () => {
    const otherClient = new PrismaClient({ datasources: { db: { url } } });
    try {
      const otherRules = new PrismaCategoryRuleRepository(otherClient);
      const saved = rule();
      await rules.save(saved);
      const first = (await rules.findById(saved.id, workspaceId))!;
      const second = (await otherRules.findById(saved.id, workspaceId))!;
      first.updateName(randomUUID());
      second.updateName(randomUUID());
      const results = await Promise.allSettled([
        rules.save(first),
        otherRules.save(second),
      ]);
      expect(
        results.filter((result) => result.status === 'fulfilled')
      ).toHaveLength(1);
      const rejected = results.find((result) => result.status === 'rejected');
      expect(rejected?.status === 'rejected' && rejected.reason).toBeInstanceOf(
        RuleWriteConflictError
      );
      expect((await rules.findById(saved.id, workspaceId))!.version).toBe(2);
      expect(
        await prisma.outboxEvent.count({
          where: {
            aggregateId: saved.id.getValue(),
            eventType: 'CategoryRuleUpdated',
          },
        })
      ).toBe(1);
    } finally {
      await otherClient.$disconnect();
    }
  });

  it('does not resurrect a rule or suggestion deleted after it was read', async () => {
    const savedRule = rule();
    await rules.save(savedRule);
    const staleRule = (await rules.findById(savedRule.id, workspaceId))!;
    savedRule.markAsDeleted();
    await rules.delete(savedRule);
    staleRule.updateDetails({ name: randomUUID() });
    await expect(rules.save(staleRule)).rejects.toBeInstanceOf(
      RuleWriteConflictError
    );
    expect(await rules.findById(savedRule.id, workspaceId)).toBeNull();
    const saved = suggestion();
    await suggestions.save(saved);
    const stale = (await suggestions.findById(saved.id, workspaceId))!;
    saved.markAsDeleted();
    await suggestions.delete(saved);
    stale.accept(randomUUID(), 1);
    await expect(suggestions.save(stale)).rejects.toBeInstanceOf(
      SuggestionNotFoundError
    );
    expect(await suggestions.findById(saved.id, workspaceId)).toBeNull();
  });

  it('persists acceptance and its expense update metadata atomically', async () => {
    const saved = suggestion();
    await suggestions.save(saved);
    const actor = randomUUID();
    saved.accept(actor, 4);
    await failOutbox();
    await expect(suggestions.save(saved)).rejects.toThrow();
    expect(
      (await suggestions.findById(saved.id, workspaceId))!.isAccepted
    ).toBeNull();
    expect(saved.domainEvents).toHaveLength(1);
    await resetFailure();
    await suggestions.save(saved);
    const event = await prisma.outboxEvent.findFirstOrThrow({
      where: {
        aggregateId: saved.id.getValue(),
        eventType: 'CategorySuggestionAccepted',
      },
    });
    expect(event.payload).toMatchObject({
      acceptedBy: actor,
      expenseVersion: 4,
      expenseId: saved.expenseId.getValue(),
      categoryId: saved.suggestedCategoryId.getValue(),
    });
  });

  it('exposes later expense-history pages without persisting state or outbox events during reads', async () => {
    const saved = rule();
    await rules.save(saved);
    const expenseId = randomUUID();
    const categoryId = saved.targetCategoryId.getValue();
    await prisma.categorySuggestion.createMany({
      data: Array.from({ length: 61 }, () => ({
        id: randomUUID(),
        workspaceId: workspaceId.getValue(),
        expenseId,
        suggestedCategoryId: categoryId,
        confidence: 0.9,
      })),
    });
    await prisma.ruleExecution.createMany({
      data: Array.from({ length: 61 }, () => ({
        id: randomUUID(),
        workspaceId: workspaceId.getValue(),
        expenseId,
        ruleId: saved.id.getValue(),
        appliedCategoryId: categoryId,
      })),
    });
    const before = await prisma.outboxEvent.count();
    const access = {
      isMember: async () => true,
      isAdminOrOwner: async () => false,
    };
    const suggestionQuery = new GetSuggestionsByExpenseHandler(
      new CategorySuggestionService(suggestions),
      access
    );
    const executionQuery = new GetExecutionsByExpenseHandler(
      new RuleExecutionService(rules, executions, evaluationWriter),
      access
    );
    for (const handler of [suggestionQuery, executionQuery]) {
      const query = {
        workspaceId: workspaceId.getValue(),
        userId: randomUUID(),
        expenseId,
        limit: 10,
        offset: 50,
      };
      const page = await handler.handle(query);
      expect(page.items).toHaveLength(10);
      expect(page.total).toBe(61);
      expect(page.offset).toBe(50);
      expect(page.hasMore).toBe(true);
      const last = await handler.handle({ ...query, offset: 60 });
      expect(last.items).toHaveLength(1);
      expect(last.hasMore).toBe(false);
      expect(
        new Set([...page.items, ...last.items].map((item) => item.id)).size
      ).toBe(11);
      const otherWorkspace = await handler.handle({
        ...query,
        workspaceId: randomUUID(),
      });
      expect(otherWorkspace.items).toHaveLength(0);
      expect(otherWorkspace.total).toBe(0);
    }
    expect(await prisma.outboxEvent.count()).toBe(before);
    expect(
      await prisma.categorySuggestion.count({ where: { expenseId } })
    ).toBe(61);
    expect(await prisma.ruleExecution.count({ where: { expenseId } })).toBe(61);
  });

  it('enforces unique names under concurrent writes, scoped by workspace', async () => {
    const name = randomUUID();
    const outcomes = await Promise.allSettled([
      rules.save(rule(name)),
      rules.save(rule(name)),
    ]);
    expect(
      outcomes.filter((result) => result.status === 'fulfilled')
    ).toHaveLength(1);
    expect(
      await prisma.categoryRule.count({
        where: { workspaceId: workspaceId.getValue(), name },
      })
    ).toBe(1);
    await expect(rules.save(rule(name))).rejects.toBeInstanceOf(
      DuplicateRuleNameError
    );
    const row = await prisma.categoryRule.findFirstOrThrow({ where: { name } });
    await expect(
      prisma.categoryRule.create({
        data: { ...row, id: randomUUID(), workspaceId: randomUUID() },
      })
    ).resolves.toBeDefined();
  });

  it('rejects missing and cross-workspace rule references', async () => {
    const saved = rule();
    await rules.save(saved);
    const data = {
      ruleId: saved.id.getValue(),
      workspaceId: randomUUID(),
      expenseId: randomUUID(),
      appliedCategoryId: randomUUID(),
    };
    await expect(prisma.ruleExecution.create({ data })).rejects.toThrow();
    await expect(
      prisma.ruleExecution.create({
        data: {
          ...data,
          ruleId: randomUUID(),
          workspaceId: workspaceId.getValue(),
        },
      })
    ).rejects.toThrow();
  });

  it('rejects invalid priority, blank names, confidence and response states at the database', async () => {
    const saved = rule();
    await rules.save(saved);
    await expect(
      prisma.categoryRule.update({
        where: { id: saved.id.getValue() },
        data: { priority: -1 },
      })
    ).rejects.toThrow();
    await expect(
      prisma.categoryRule.update({
        where: { id: saved.id.getValue() },
        data: { name: '   ' },
      })
    ).rejects.toThrow();
    const data = {
      workspaceId: workspaceId.getValue(),
      expenseId: randomUUID(),
      suggestedCategoryId: randomUUID(),
      confidence: 0.9,
    };
    for (const confidence of [
      -0.1,
      1.1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]) {
      await expect(
        prisma.categorySuggestion.create({ data: { ...data, confidence } })
      ).rejects.toThrow();
    }
    await expect(
      prisma.categorySuggestion.create({ data: { ...data, isAccepted: true } })
    ).rejects.toThrow();
    await expect(
      prisma.categorySuggestion.create({
        data: { ...data, respondedAt: new Date() },
      })
    ).rejects.toThrow();
    await expect(
      prisma.categorySuggestion.create({
        data: {
          ...data,
          isAccepted: false,
          createdAt: new Date(),
          respondedAt: new Date(0),
        },
      })
    ).rejects.toThrow();
  });

  it('rolls back a rule creation on outbox failure and retains events for retry', async () => {
    const pending = rule();
    const eventId = pending.domainEvents[0].eventId;
    await failOutbox();
    await expect(rules.save(pending)).rejects.toThrow();
    expect(
      await prisma.categoryRule.findUnique({
        where: { id: pending.id.getValue() },
      })
    ).toBeNull();
    expect(pending.domainEvents[0].eventId).toBe(eventId);
    await resetFailure();
    await rules.save(pending);
    expect(await prisma.outboxEvent.count({ where: { id: eventId } })).toBe(1);
    expect(pending.domainEvents).toHaveLength(0);
  });

  it('rolls back rule update and deletion when their event cannot persist', async () => {
    const saved = rule();
    const originalName = saved.name;
    await rules.save(saved);
    saved.updateName(randomUUID());
    await failOutbox();
    await expect(rules.save(saved)).rejects.toThrow();
    expect(saved.version).toBe(1);
    expect(
      (
        await prisma.categoryRule.findUniqueOrThrow({
          where: { id: saved.id.getValue() },
        })
      ).name
    ).toBe(originalName);
    saved.clearDomainEvents();
    saved.markAsDeleted();
    await expect(rules.delete(saved)).rejects.toThrow();
    expect(
      (
        await prisma.categoryRule.findUniqueOrThrow({
          where: { id: saved.id.getValue() },
        })
      ).deletedAt
    ).toBeNull();
  });

  it('preserves execution history on deletion and hides deleted rules from operational reads', async () => {
    const saved = rule();
    await rules.save(saved);
    await prisma.ruleExecution.create({
      data: {
        ruleId: saved.id.getValue(),
        workspaceId: workspaceId.getValue(),
        expenseId: randomUUID(),
        appliedCategoryId: randomUUID(),
      },
    });
    saved.markAsDeleted();
    await rules.delete(saved);
    expect(await rules.findById(saved.id, workspaceId)).toBeNull();
    expect(
      (await rules.findByWorkspaceId(workspaceId)).items.some((item) =>
        item.id.equals(saved.id)
      )
    ).toBe(false);
    expect(
      (await rules.findActiveByWorkspaceId(workspaceId)).items.some((item) =>
        item.id.equals(saved.id)
      )
    ).toBe(false);
    expect(
      await prisma.ruleExecution.count({
        where: { ruleId: saved.id.getValue() },
      })
    ).toBe(1);
    expect(
      await rules.findByName(` ${saved.name} `, workspaceId)
    ).not.toBeNull();
    expect(
      await rules.findIncludingDeleted(
        saved.id,
        WorkspaceId.fromString(randomUUID())
      )
    ).toBeNull();
    const historical = await executions.findByRuleId(saved.id, workspaceId);
    expect(historical.total).toBe(1);
    expect(
      (
        await executions.findByRuleId(
          saved.id,
          WorkspaceId.fromString(randomUUID())
        )
      ).total
    ).toBe(0);
    await expect(
      prisma.categoryRule.delete({ where: { id: saved.id.getValue() } })
    ).rejects.toThrow();
    expect(
      await prisma.outboxEvent.count({
        where: {
          aggregateId: saved.id.getValue(),
          eventType: 'CategoryRuleDeleted',
        },
      })
    ).toBe(1);
  });

  it('rolls back suggestion creation and deletion on outbox failure', async () => {
    const pending = suggestion();
    await failOutbox();
    await expect(suggestions.save(pending)).rejects.toThrow();
    expect(
      await prisma.categorySuggestion.count({
        where: { id: pending.id.getValue() },
      })
    ).toBe(0);
    await resetFailure();
    await suggestions.save(pending);
    pending.markAsDeleted();
    await failOutbox();
    await expect(suggestions.delete(pending)).rejects.toThrow();
    expect(
      await prisma.categorySuggestion.count({
        where: { id: pending.id.getValue() },
      })
    ).toBe(1);
  });

  it('commits evaluation records and both aggregate events together; rolls all back on failure', async () => {
    const saved = rule();
    await rules.save(saved);
    const pending = suggestion(saved.targetCategoryId);
    const execution = RuleExecution.create({
      ruleId: saved.id,
      workspaceId,
      expenseId: pending.expenseId,
      appliedCategoryId: saved.targetCategoryId,
    });
    saved.recordExecution(
      execution.id.getValue(),
      pending.expenseId.getValue(),
      true
    );
    await failOutbox();
    await expect(
      evaluationWriter.commit(execution, pending, saved)
    ).rejects.toThrow();
    expect(
      await prisma.ruleExecution.count({
        where: { id: execution.id.getValue() },
      })
    ).toBe(0);
    expect(
      await prisma.categorySuggestion.count({
        where: { id: pending.id.getValue() },
      })
    ).toBe(0);
    expect(saved.domainEvents).toHaveLength(1);
    expect(pending.domainEvents).toHaveLength(1);
    await resetFailure();
    await evaluationWriter.commit(execution, pending, saved);
    expect(
      await prisma.ruleExecution.count({
        where: { id: execution.id.getValue() },
      })
    ).toBe(1);
    expect(
      await prisma.outboxEvent.count({
        where: { aggregateId: pending.id.getValue() },
      })
    ).toBe(1);
    expect(saved.domainEvents).toHaveLength(0);
    expect(pending.domainEvents).toHaveLength(0);
  });

  it('rejects evaluation if its rule was deleted after being read', async () => {
    const saved = rule();
    await rules.save(saved);
    const staleRule = await rules.findById(saved.id, workspaceId);
    const pending = suggestion(saved.targetCategoryId);
    const execution = RuleExecution.create({
      ruleId: saved.id,
      workspaceId,
      expenseId: pending.expenseId,
      appliedCategoryId: saved.targetCategoryId,
    });
    saved.markAsDeleted();
    await rules.delete(saved);
    staleRule!.recordExecution(
      execution.id.getValue(),
      pending.expenseId.getValue(),
      true
    );
    await expect(
      evaluationWriter.commit(execution, pending, staleRule!)
    ).rejects.toThrow('no longer active');
    expect(
      await prisma.ruleExecution.count({
        where: { id: execution.id.getValue() },
      })
    ).toBe(0);
    expect(
      await prisma.categorySuggestion.count({
        where: { id: pending.id.getValue() },
      })
    ).toBe(0);
  });

  it('serializes competing suggestion responses and persists only the winning response event', async () => {
    const original = suggestion();
    await suggestions.save(original);
    const accepted = await suggestions.findById(original.id, workspaceId);
    const rejected = await suggestions.findById(original.id, workspaceId);
    accepted!.accept(randomUUID(), 1);
    rejected!.reject();
    const results = await Promise.allSettled([
      suggestions.save(accepted!),
      suggestions.save(rejected!),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled')
    ).toHaveLength(1);
    expect(
      await prisma.outboxEvent.count({
        where: {
          aggregateId: original.id.getValue(),
          eventType: {
            in: ['CategorySuggestionAccepted', 'CategorySuggestionRejected'],
          },
        },
      })
    ).toBe(1);
    const stored = await suggestions.findById(original.id, workspaceId);
    expect(stored!.isAccepted).not.toBeNull();
    expect(stored!.respondedAt).not.toBeNull();
  });

  it.each(['category', 'condition', 'priority'] as const)(
    'rejects a stale evaluation after rule %s changes',
    async (field) => {
      const saved = rule();
      await rules.save(saved);
      const stale = await rules.findById(saved.id, workspaceId);
      const pending = suggestion(stale!.targetCategoryId);
      const execution = RuleExecution.create({
        ruleId: saved.id,
        workspaceId,
        expenseId: pending.expenseId,
        appliedCategoryId: stale!.targetCategoryId,
      });
      stale!.recordExecution(
        execution.id.getValue(),
        pending.expenseId.getValue(),
        true
      );
      if (field === 'category')
        saved.updateTargetCategory(CategoryId.fromString(randomUUID()));
      else if (field === 'condition')
        saved.updateCondition(
          RuleCondition.create(RuleConditionType.MERCHANT_CONTAINS, 'changed')
        );
      else saved.updatePriority(1);
      await rules.save(saved);
      await expect(
        evaluationWriter.commit(execution, pending, stale!)
      ).rejects.toMatchObject({
        code: 'RULE_EVALUATION_CONFLICT',
        statusCode: 409,
      });
      expect(
        await prisma.ruleExecution.count({
          where: { id: execution.id.getValue() },
        })
      ).toBe(0);
      expect(
        await prisma.categorySuggestion.count({
          where: { id: pending.id.getValue() },
        })
      ).toBe(0);
    }
  );

  it('rejects attempts to move an existing suggestion into another workspace', async () => {
    const original = suggestion();
    await suggestions.save(original);
    const forged = CategorySuggestion.fromPersistence({
      id: original.id,
      workspaceId: WorkspaceId.fromString(randomUUID()),
      expenseId: original.expenseId,
      suggestedCategoryId: original.suggestedCategoryId,
      confidence: original.confidence,
      reason: original.reason,
      isAccepted: original.isAccepted,
      createdAt: original.createdAt,
      respondedAt: original.respondedAt,
    });
    await expect(suggestions.save(forged)).rejects.toThrow('ownership');
    expect(
      (await suggestions.findById(
        original.id,
        workspaceId
      ))!.workspaceId.equals(workspaceId)
    ).toBe(true);
  });

  it('scopes every repository lookup and list to its workspace and reconstitutes persisted rows without events', async () => {
    const saved = rule();
    await rules.save(saved);
    const pending = suggestion(saved.targetCategoryId);
    await suggestions.save(pending);
    const execution = RuleExecution.create({
      ruleId: saved.id,
      workspaceId,
      expenseId: pending.expenseId,
      appliedCategoryId: saved.targetCategoryId,
    });
    await prisma.ruleExecution.create({
      data: {
        id: execution.id.getValue(),
        ruleId: saved.id.getValue(),
        workspaceId: workspaceId.getValue(),
        expenseId: pending.expenseId.getValue(),
        appliedCategoryId: saved.targetCategoryId.getValue(),
      },
    });
    const foreign = WorkspaceId.fromString(randomUUID());
    expect(await rules.findById(saved.id, foreign)).toBeNull();
    expect(await rules.findByName(saved.name, foreign)).toBeNull();
    expect(await rules.findIncludingDeleted(saved.id, foreign)).toBeNull();
    expect(await suggestions.findById(pending.id, foreign)).toBeNull();
    expect(await executions.findById(execution.id, foreign)).toBeNull();
    const foreignLists = await Promise.all([
      rules.findByWorkspaceId(foreign),
      rules.findActiveByWorkspaceId(foreign),
      suggestions.findByWorkspaceId(foreign),
      suggestions.findPendingByWorkspaceId(foreign),
      suggestions.findByExpenseId(pending.expenseId, foreign),
      executions.findByWorkspaceId(foreign),
      executions.findByRuleId(saved.id, foreign),
      executions.findByExpenseId(pending.expenseId, foreign),
    ]);
    for (const page of foreignLists) {
      expect(page.items).toHaveLength(0);
      expect(page.total).toBe(0);
    }
    const restoredRule = (await rules.findById(saved.id, workspaceId))!;
    const restoredSuggestion = (await suggestions.findById(
      pending.id,
      workspaceId
    ))!;
    expect(restoredRule.domainEvents).toHaveLength(0);
    expect(restoredSuggestion.domainEvents).toHaveLength(0);
    expect(restoredRule.version).toBe(saved.version);
    expect(restoredSuggestion.confidence.equals(pending.confidence)).toBe(true);
    expect(
      (await executions.findById(
        execution.id,
        workspaceId
      ))!.appliedCategoryId.equals(saved.targetCategoryId)
    ).toBe(true);
  });
});
