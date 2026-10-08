import { PrismaRuleEvaluationAdapter } from './modules/categorization-rules/infrastructure/adapters/prisma-rule-evaluation.adapter';
import { PrismaClient } from '@prisma/client';

// Repositories
import { PrismaCategoryRuleRepository } from './modules/categorization-rules/infrastructure/persistence/category-rule.repository.impl';
import { PrismaRuleExecutionRepository } from './modules/categorization-rules/infrastructure/persistence/rule-execution.repository.impl';
import { PrismaCategorySuggestionRepository } from './modules/categorization-rules/infrastructure/persistence/category-suggestion.repository.impl';

// Adapters & Services
import { HttpWorkspaceAccessAdapter } from './modules/categorization-rules/infrastructure/adapters/http-workspace-access.adapter';
import { HttpSuggestionAcceptanceAdapter } from './modules/categorization-rules/infrastructure/adapters/http-suggestion-acceptance.adapter';
import { HttpCategorizationReferenceAdapter } from './modules/categorization-rules/infrastructure/adapters/http-categorization-reference.adapter';
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
export function createCompositionRoot(prisma: PrismaClient) {


    // Repositories
    const categoryRuleRepository = new PrismaCategoryRuleRepository(prisma);
    const ruleExecutionRepository = new PrismaRuleExecutionRepository(prisma);
    const categorySuggestionRepository = new PrismaCategorySuggestionRepository(prisma);
    const outboxEventRepository = new PrismaOutboxEventRepository(prisma);

    // Adapters & Services
    const workspaceAccessAdapter = new HttpWorkspaceAccessAdapter();
    const references = new HttpCategorizationReferenceAdapter();
    const categoryRuleService = new CategoryRuleService(categoryRuleRepository, workspaceAccessAdapter, references);
    const ruleExecutionService = new RuleExecutionService(categoryRuleRepository, ruleExecutionRepository, new PrismaRuleEvaluationAdapter(prisma));
    const categorySuggestionService = new CategorySuggestionService(categorySuggestionRepository);

    // Command Handlers
    const createCategoryRuleHandler = new CreateCategoryRuleHandler(categoryRuleService);
    const updateCategoryRuleHandler = new UpdateCategoryRuleHandler(categoryRuleService);
    const deleteCategoryRuleHandler = new DeleteCategoryRuleHandler(categoryRuleService);
    const activateCategoryRuleHandler = new ActivateCategoryRuleHandler(categoryRuleService);
    const deactivateCategoryRuleHandler = new DeactivateCategoryRuleHandler(categoryRuleService);
    const evaluateRulesHandler = new EvaluateRulesHandler(ruleExecutionService, workspaceAccessAdapter, references);
    const createSuggestionHandler = new CreateSuggestionHandler(categorySuggestionService, workspaceAccessAdapter, references);
    const acceptSuggestionHandler = new AcceptSuggestionHandler(categorySuggestionService, workspaceAccessAdapter, new HttpSuggestionAcceptanceAdapter());
    const rejectSuggestionHandler = new RejectSuggestionHandler(categorySuggestionService, workspaceAccessAdapter);
    const deleteSuggestionHandler = new DeleteSuggestionHandler(categorySuggestionService, workspaceAccessAdapter);

    // Query Handlers
    const getRuleByIdHandler = new GetRuleByIdHandler(categoryRuleService);
    const getRulesByWorkspaceHandler = new GetRulesByWorkspaceHandler(categoryRuleService);
    const getActiveRulesByWorkspaceHandler = new GetActiveRulesByWorkspaceHandler(categoryRuleService);
    const getExecutionsByRuleHandler = new GetExecutionsByRuleHandler(ruleExecutionService, workspaceAccessAdapter);
    const getExecutionsByExpenseHandler = new GetExecutionsByExpenseHandler(ruleExecutionService, workspaceAccessAdapter);
    const getExecutionsByWorkspaceHandler = new GetExecutionsByWorkspaceHandler(ruleExecutionService, workspaceAccessAdapter);
    const getSuggestionByIdHandler = new GetSuggestionByIdHandler(categorySuggestionService, workspaceAccessAdapter);
    const getSuggestionsByExpenseHandler = new GetSuggestionsByExpenseHandler(categorySuggestionService, workspaceAccessAdapter);
    const getPendingSuggestionsByWorkspaceHandler = new GetPendingSuggestionsByWorkspaceHandler(categorySuggestionService, workspaceAccessAdapter);
    const getSuggestionsByWorkspaceHandler = new GetSuggestionsByWorkspaceHandler(categorySuggestionService, workspaceAccessAdapter);

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
  return Object.freeze({
    prisma,
    outboxEventRepository,
    categorizationRules: Object.freeze({
      categoryRuleController,
      ruleExecutionController,
      categorySuggestionController,
    }),
  });
}

export type CompositionRoot = ReturnType<typeof createCompositionRoot>;
