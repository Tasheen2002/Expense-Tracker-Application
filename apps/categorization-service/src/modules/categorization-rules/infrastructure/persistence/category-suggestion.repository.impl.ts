import { PrismaClient, Prisma } from '@prisma/client';
import { ICategorySuggestionRepository } from '../../domain/repositories/category-suggestion.repository';
import { CategorySuggestion } from '../../domain/entities/category-suggestion.entity';
import { SuggestionId } from '../../domain/value-objects/suggestion-id';
import { WorkspaceId } from '@core/domain/value-objects';
import { ExpenseId, CategoryId } from '@core/domain/value-objects';
import { ConfidenceScore } from '../../domain/value-objects/confidence-score';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import {
  InvalidSuggestionError,
  SuggestionAlreadyRespondedError,
  SuggestionNotFoundError,
} from '../../domain/errors/categorization-rules.errors';

export class PrismaCategorySuggestionRepository
  extends PrismaRepository<CategorySuggestion>
  implements ICategorySuggestionRepository
{
  constructor(prisma: PrismaClient) {
    super(prisma);
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

    await this.persistWithEvents(suggestion, async (tx) => {
      await tx.$queryRaw`SELECT id FROM categorization_rules.category_suggestions WHERE id = ${data.id}::uuid FOR UPDATE`;
      const existing = await tx.categorySuggestion.findUnique({
        where: { id: data.id },
      });
      if (!existing) {
        if (
          !suggestion.domainEvents.some(
            (event) => event.eventType === 'CategorySuggestionCreated'
          )
        ) {
          throw new SuggestionNotFoundError(data.id);
        }
        return tx.categorySuggestion.create({ data });
      }
      if (
        existing.workspaceId !== data.workspaceId ||
        existing.expenseId !== data.expenseId ||
        existing.suggestedCategoryId !== data.suggestedCategoryId ||
        existing.confidence !== data.confidence ||
        existing.reason !== data.reason ||
        existing.createdAt.getTime() !== data.createdAt.getTime()
      ) {
        throw new InvalidSuggestionError(
          'Suggestion ownership and original proposal cannot be changed'
        );
      }
      if (
        existing.isAccepted !== null &&
        (existing.isAccepted !== data.isAccepted ||
          existing.respondedAt?.getTime() !== data.respondedAt?.getTime() ||
          suggestion.domainEvents.some(
            (event) =>
              event.eventType === 'CategorySuggestionAccepted' ||
              event.eventType === 'CategorySuggestionRejected'
          ))
      ) {
        throw new SuggestionAlreadyRespondedError(data.id);
      }
      return tx.categorySuggestion.update({
        where: { id: data.id, workspaceId: data.workspaceId },
        data: { isAccepted: data.isAccepted, respondedAt: data.respondedAt },
      });
    });
  }

  async findById(
    id: SuggestionId,
    workspaceId: WorkspaceId
  ): Promise<CategorySuggestion | null> {
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
    options?: PaginationOptions
  ): Promise<PaginatedResult<CategorySuggestion>> {
    return PrismaRepositoryHelper.paginate(
      (page) =>
        this.prisma.categorySuggestion.findMany({
          where: {
            expenseId: expenseId.getValue(),
            workspaceId: workspaceId.getValue(),
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
          ...page,
        }),
      () =>
        this.prisma.categorySuggestion.count({
          where: {
            expenseId: expenseId.getValue(),
            workspaceId: workspaceId.getValue(),
          },
        }),
      (suggestion) => this.toDomain(suggestion),
      options
    );
  }

  async findPendingByWorkspaceId(
    workspaceId: WorkspaceId,
    options?: PaginationOptions
  ): Promise<PaginatedResult<CategorySuggestion>> {
    return PrismaRepositoryHelper.paginate(
      (page) =>
        this.prisma.categorySuggestion.findMany({
          where: {
            workspaceId: workspaceId.getValue(),
            isAccepted: null,
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
          ...page,
        }),
      () =>
        this.prisma.categorySuggestion.count({
          where: {
            workspaceId: workspaceId.getValue(),
            isAccepted: null,
          },
        }),
      (suggestion) => this.toDomain(suggestion),
      options
    );
  }

  async findByWorkspaceId(
    workspaceId: WorkspaceId,
    options?: PaginationOptions
  ): Promise<PaginatedResult<CategorySuggestion>> {
    return PrismaRepositoryHelper.paginate(
      (page) =>
        this.prisma.categorySuggestion.findMany({
          where: { workspaceId: workspaceId.getValue() },
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
          ...page,
        }),
      () =>
        this.prisma.categorySuggestion.count({
          where: { workspaceId: workspaceId.getValue() },
        }),
      (suggestion) => this.toDomain(suggestion),
      options
    );
  }

  async delete(suggestion: CategorySuggestion): Promise<void> {
    await this.persistWithEvents(suggestion, (tx) =>
      tx.categorySuggestion.delete({
        where: {
          id: suggestion.id.getValue(),
          workspaceId: suggestion.workspaceId.getValue(),
        },
      })
    );
  }

  private toDomain(
    raw: Prisma.CategorySuggestionGetPayload<object>
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
