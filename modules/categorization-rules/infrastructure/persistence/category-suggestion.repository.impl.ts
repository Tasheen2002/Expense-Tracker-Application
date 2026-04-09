import { PrismaClient, Prisma } from "@prisma/client";
import { ICategorySuggestionRepository } from "../../domain/repositories/category-suggestion.repository";
import { CategorySuggestion } from "../../domain/entities/category-suggestion.entity";
import { SuggestionId } from "../../domain/value-objects/suggestion-id";
import { WorkspaceId } from "../../../identity-workspace";
import { ExpenseId, CategoryId } from "../../../expense-ledger";
import { ConfidenceScore } from "../../domain/value-objects/confidence-score";
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { IEventBus } from '../../../../packages/core/src/domain/events/domain-event';

export class PrismaCategorySuggestionRepository
  extends PrismaRepository<CategorySuggestion>
  implements ICategorySuggestionRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(suggestion: CategorySuggestion): Promise<void> {
    const data = {
      id: suggestion.id.getValue(),
      workspaceId: suggestion.workspaceId.getValue(),
      expenseId: suggestion.expenseId.getValue(),
      suggestedCategoryId: suggestion.suggestedCategoryId.getValue(),
      confidence: suggestion.confidence.getValue(),
      reason: suggestion.reason,
      isAccepted: suggestion.isAccepted,
      createdAt: suggestion.createdAt,
      respondedAt: suggestion.respondedAt,
    };

    await this.prisma.categorySuggestion.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });

    await this.dispatchEvents(suggestion);
  }

  async findById(id: SuggestionId, workspaceId: WorkspaceId): Promise<CategorySuggestion | null> {
    const suggestion = await this.prisma.categorySuggestion.findFirst({
      where: {
        id: id.getValue(),
        workspaceId: workspaceId.getValue(),
      },
    });

    if (!suggestion) {
      return null;
    }

    return this.toDomain(suggestion);
  }

  async findByExpenseId(
    expenseId: ExpenseId,
    workspaceId: WorkspaceId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<CategorySuggestion>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.categorySuggestion,
      {
        where: {
          expenseId: expenseId.getValue(),
          workspaceId: workspaceId.getValue(),
        },
        orderBy: { createdAt: "desc" },
      },
      (suggestion) => this.toDomain(suggestion),
      options,
    );
  }

  async findPendingByWorkspaceId(
    workspaceId: WorkspaceId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<CategorySuggestion>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.categorySuggestion,
      {
        where: {
          workspaceId: workspaceId.getValue(),
          isAccepted: null,
        },
        orderBy: { createdAt: "desc" },
      },
      (suggestion) => this.toDomain(suggestion),
      options,
    );
  }

  async findByWorkspaceId(
    workspaceId: WorkspaceId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<CategorySuggestion>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.categorySuggestion,
      {
        where: { workspaceId: workspaceId.getValue() },
        orderBy: { createdAt: "desc" },
      },
      (suggestion) => this.toDomain(suggestion),
      options,
    );
  }

  async delete(id: SuggestionId): Promise<void> {
    await this.prisma.categorySuggestion.delete({
      where: { id: id.getValue() },
    });
  }

  private toDomain(
    raw: Prisma.CategorySuggestionGetPayload<object>,
  ): CategorySuggestion {
    return CategorySuggestion.fromPersistence({
      id: SuggestionId.fromString(raw.id),
      workspaceId: WorkspaceId.fromString(raw.workspaceId),
      expenseId: ExpenseId.fromString(raw.expenseId),
      suggestedCategoryId: CategoryId.fromString(raw.suggestedCategoryId),
      confidence: ConfidenceScore.create(raw.confidence),
      reason: raw.reason,
      isAccepted: raw.isAccepted,
      createdAt: raw.createdAt,
      respondedAt: raw.respondedAt,
    });
  }
}
