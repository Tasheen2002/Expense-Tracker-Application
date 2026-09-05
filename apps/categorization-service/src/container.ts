import { PrismaClient } from '@prisma/client';
import { getEventBus, InMemoryEventBus } from '@expense-tracker/core';

// Repositories
import { PrismaCategoryRuleRepository } from './modules/categorization-rules/infrastructure/persistence/category-rule.repository.impl';
import { PrismaRuleExecutionRepository } from './modules/categorization-rules/infrastructure/persistence/rule-execution.repository.impl';
import { PrismaCategorySuggestionRepository } from './modules/categorization-rules/infrastructure/persistence/category-suggestion.repository.impl';

// Adapters & Services
import { PrismaWorkspaceAccessAdapter } from './modules/categorization-rules/infrastructure/adapters/prisma-workspace-access.adapter';
import { CategoryRuleService } from './modules/categorization-rules/application/services/category-rule.service';
import { RuleExecutionService } from './modules/categorization-rules/application/services/rule-execution.service';
import { CategorySuggestionService } from './modules/categorization-rules/application/services/category-suggestion.service';

// Command Handlers
import { CreateCategoryRuleHandler } from './modules/categorization-rules/application/commands/create-category-rule.command';
import { UpdateCategoryRuleHandler } from './modules/categorization-rules/application/commands/update-category-rule.command';
import { DeleteCategoryRuleHandler } from './modules/categorization-rules/application/commands/delete-category-rule.command';
import { ActivateCategoryRuleHandler } from './modules/categorization-rules/application/commands/activate-category-rule.command';
import { DeactivateCategoryRuleHandler } from './modules/categorization-rules/application/commands/deactivate-category-rule.command';
import { EvaluateRulesHandler } from './modules/categorization-rules/application/commands/evaluate-rules.command';
import { CreateSuggestionHandler } from './modules/categorization-rules/application/commands/create-suggestion.command';
import { AcceptSuggestionHandler } from './modules/categorization-rules/application/commands/accept-suggestion.command';
import { RejectSuggestionHandler } from './modules/categorization-rules/application/commands/reject-suggestion.command';
import { DeleteSuggestionHandler } from './modules/categorization-rules/application/commands/delete-suggestion.command';

// Query Handlers
import { GetRuleByIdHandler } from './modules/categorization-rules/application/queries/get-rule-by-id.query';
import { GetRulesByWorkspaceHandler } from './modules/categorization-rules/application/queries/get-rules-by-workspace.query';
import { GetActiveRulesByWorkspaceHandler } from './modules/categorization-rules/application/queries/get-active-rules-by-workspace.query';
import { GetExecutionsByRuleHandler } from './modules/categorization-rules/application/queries/get-executions-by-rule.query';
import { GetExecutionsByExpenseHandler } from './modules/categorization-rules/application/queries/get-executions-by-expense.query';
import { GetExecutionsByWorkspaceHandler } from './modules/categorization-rules/application/queries/get-executions-by-workspace.query';
import { GetSuggestionByIdHandler } from './modules/categorization-rules/application/queries/get-suggestion-by-id.query';
import { GetSuggestionsByExpenseHandler } from './modules/categorization-rules/application/queries/get-suggestions-by-expense.query';
import { GetPendingSuggestionsByWorkspaceHandler } from './modules/categorization-rules/application/queries/get-pending-suggestions-by-workspace.query';
import { GetSuggestionsByWorkspaceHandler } from './modules/categorization-rules/application/queries/get-suggestions-by-workspace.query';

// Controllers
import { CategoryRuleController } from './modules/categorization-rules/infrastructure/http/controllers/category-rule.controller';
import { RuleExecutionController } from './modules/categorization-rules/infrastructure/http/controllers/rule-execution.controller';
import { CategorySuggestionController } from './modules/categorization-rules/infrastructure/http/controllers/category-suggestion.controller';

import { PrismaOutboxEventRepository } from './repositories/outbox-event.repository';
import { DomainEvent, DomainEventHandler } from '@expense-tracker/core';

class OutboxEventHandler implements DomainEventHandler {
  constructor(
    public readonly eventType: string,
    private readonly prisma: PrismaClient
  ) {}

  async handle(event: DomainEvent): Promise<void> {
    try {
      await this.prisma.outboxEvent.create({
        data: {
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          eventType: event.eventType,
          payload: event.getPayload() as any,
          status: 'PENDING',
        },
      });
    } catch (err) {
      console.error(`[OutboxEventHandler] Failed to persist event ${event.eventType} to outbox:`, err);
    }
  }
}

export class Container {
  private static instance: Container;
  private services: Map<string, unknown> = new Map();

  private constructor() {}

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  register(prisma: PrismaClient): void {
    const eventBus = getEventBus() as InMemoryEventBus;

    // Register outbox event listeners to intercept domain events and write them to outbox
    const eventsToOutbox = [
      'CategoryRuleCreated',
      'CategoryRuleActivated',
      'CategoryRuleDeactivated',
      'CategoryRuleUpdated',
      'CategoryRuleDeleted',
      'RuleExecuted',
      'CategorySuggestionCreated',
      'CategorySuggestionAccepted',
      'CategorySuggestionRejected',
      'CategorySuggestionDeleted',
    ];

    for (const eventName of eventsToOutbox) {
      eventBus.subscribe(eventName, new OutboxEventHandler(eventName, prisma));
    }

    // Repositories
    const categoryRuleRepository = new PrismaCategoryRuleRepository(prisma, eventBus);
    const ruleExecutionRepository = new PrismaRuleExecutionRepository(prisma);
    const categorySuggestionRepository = new PrismaCategorySuggestionRepository(prisma, eventBus);
    const outboxEventRepository = new PrismaOutboxEventRepository(prisma);

    this.services.set('categoryRuleRepository', categoryRuleRepository);
    this.services.set('ruleExecutionRepository', ruleExecutionRepository);
    this.services.set('categorySuggestionRepository', categorySuggestionRepository);
    this.services.set('outboxEventRepository', outboxEventRepository);

    // Adapters & Services
    const workspaceAccessAdapter = new PrismaWorkspaceAccessAdapter();
    const categoryRuleService = new CategoryRuleService(categoryRuleRepository, workspaceAccessAdapter);
    const ruleExecutionService = new RuleExecutionService(categoryRuleRepository, ruleExecutionRepository);
    const categorySuggestionService = new CategorySuggestionService(categorySuggestionRepository);

    this.services.set('categoryRuleService', categoryRuleService);
    this.services.set('ruleExecutionService', ruleExecutionService);
    this.services.set('categorySuggestionService', categorySuggestionService);

    // Command Handlers
    const createCategoryRuleHandler = new CreateCategoryRuleHandler(categoryRuleService);
    const updateCategoryRuleHandler = new UpdateCategoryRuleHandler(categoryRuleService);
    const deleteCategoryRuleHandler = new DeleteCategoryRuleHandler(categoryRuleService);
    const activateCategoryRuleHandler = new ActivateCategoryRuleHandler(categoryRuleService);
    const deactivateCategoryRuleHandler = new DeactivateCategoryRuleHandler(categoryRuleService);
    const evaluateRulesHandler = new EvaluateRulesHandler(ruleExecutionService);
    const createSuggestionHandler = new CreateSuggestionHandler(categorySuggestionService);
    const acceptSuggestionHandler = new AcceptSuggestionHandler(categorySuggestionService);
    const rejectSuggestionHandler = new RejectSuggestionHandler(categorySuggestionService);
    const deleteSuggestionHandler = new DeleteSuggestionHandler(categorySuggestionService);

    // Query Handlers
    const getRuleByIdHandler = new GetRuleByIdHandler(categoryRuleService);
    const getRulesByWorkspaceHandler = new GetRulesByWorkspaceHandler(categoryRuleService);
    const getActiveRulesByWorkspaceHandler = new GetActiveRulesByWorkspaceHandler(categoryRuleService);
    const getExecutionsByRuleHandler = new GetExecutionsByRuleHandler(ruleExecutionService);
    const getExecutionsByExpenseHandler = new GetExecutionsByExpenseHandler(ruleExecutionService);
    const getExecutionsByWorkspaceHandler = new GetExecutionsByWorkspaceHandler(ruleExecutionService);
    const getSuggestionByIdHandler = new GetSuggestionByIdHandler(categorySuggestionService);
    const getSuggestionsByExpenseHandler = new GetSuggestionsByExpenseHandler(categorySuggestionService);
    const getPendingSuggestionsByWorkspaceHandler = new GetPendingSuggestionsByWorkspaceHandler(categorySuggestionService);
    const getSuggestionsByWorkspaceHandler = new GetSuggestionsByWorkspaceHandler(categorySuggestionService);

    // Controllers
    const categoryRuleController = new CategoryRuleController(
      createCategoryRuleHandler,
      updateCategoryRuleHandler,
      deleteCategoryRuleHandler,
      activateCategoryRuleHandler,
      deactivateCategoryRuleHandler,
      getRuleByIdHandler,
      getRulesByWorkspaceHandler,
      getActiveRulesByWorkspaceHandler,
      getExecutionsByRuleHandler
    );

    const ruleExecutionController = new RuleExecutionController(
      evaluateRulesHandler,
      getExecutionsByExpenseHandler,
      getExecutionsByWorkspaceHandler
    );

    const categorySuggestionController = new CategorySuggestionController(
      createSuggestionHandler,
      acceptSuggestionHandler,
      rejectSuggestionHandler,
      deleteSuggestionHandler,
      getSuggestionByIdHandler,
      getSuggestionsByExpenseHandler,
      getPendingSuggestionsByWorkspaceHandler,
      getSuggestionsByWorkspaceHandler
    );

    this.services.set('categoryRuleController', categoryRuleController);
    this.services.set('ruleExecutionController', ruleExecutionController);
    this.services.set('categorySuggestionController', categorySuggestionController);
    this.services.set('prisma', prisma);
  }

  get<T>(serviceName: string): T {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found in container`);
    }
    return service as T;
  }

  getCategorizationRulesServices() {
    return {
      categoryRuleController: this.get<CategoryRuleController>('categoryRuleController'),
      ruleExecutionController: this.get<RuleExecutionController>('ruleExecutionController'),
      categorySuggestionController: this.get<CategorySuggestionController>('categorySuggestionController'),
      prisma: this.get<PrismaClient>('prisma'),
    };
  }
}

export const container = Container.getInstance();
