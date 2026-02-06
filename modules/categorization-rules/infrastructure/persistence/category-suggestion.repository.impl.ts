import { PrismaClient } from "@prisma/client";
import { CategorySuggestionRepository } from "../../domain/repositories/category-suggestion.repository";
import { CategorySuggestion } from "../../domain/entities/category-suggestion.entity";
import { SuggestionId } from "../../domain/value-objects/suggestion-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { ExpenseId } from "../../../expense-ledger/domain/value-objects/expense-id";
import { CategoryId } from "../../../expense-ledger/domain/value-objects/category-id";
import { ConfidenceScore } from "../../domain/value-objects/confidence-score";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";
import { PrismaRepositoryHelper } from "../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.helper";
import { PrismaRepository } from "../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.base";
import { IEventBus } from "../../../../apps/api/src/shared/domain/events/domain-event";

export class PrismaCategorySuggestionRepository
  extends PrismaRepository<CategorySuggestion>
  implements CategorySuggestionRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(suggestion: CategorySuggestion): Promise<void> {
    const data = {
      id: suggestion.getId().getValue(),
      workspaceId: suggestion.getWorkspaceId().getValue(),
      expenseId: suggestion.getExpenseId().getValue(),
      suggestedCategoryId: suggestion.getSuggestedCategoryId().getValue(),
      confidence: suggestion.getConfidence().getValue(),
      reason: suggestion.getReason(),
      isAccepted: suggestion.getIsAccepted(),
      createdAt: suggestion.getCreatedAt(),
      respondedAt: suggestion.getRespondedAt(),
    };

    await this.prisma.categorySuggestion.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });

    await this.dispatchEvents(suggestion);
  }

  async findById(id: SuggestionId): Promise<CategorySuggestion | null> {
    const suggestion = await this.prisma.categorySuggestion.findUnique({
      where: { id: id.getValue() },
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

  private toDomain(raw: any): CategorySuggestion {
    return CategorySuggestion.reconstitute({
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
