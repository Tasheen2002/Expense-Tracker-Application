import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export class PaginationValidationError extends Error {
  readonly statusCode = 400;
  readonly code = 'INVALID_PAGINATION';
  constructor() {
    super(
      'Limit must be an integer from 1 to 100; offset must be an integer from 0 to 2147483647'
    );
  }
}

export class PrismaRepositoryHelper {
  private static readonly MAX_PAGE_SIZE = 100;
  private static readonly DEFAULT_PAGE_SIZE = 50;

  static async paginate<TPrismaModel, TDomainEntity>(
    readPage: (page: { take: number; skip: number }) => Promise<TPrismaModel[]>,
    count: () => Promise<number>,
    mapper: (record: TPrismaModel) => TDomainEntity,
    options?: PaginationOptions
  ): Promise<PaginatedResult<TDomainEntity>> {
    const limit = options?.limit ?? this.DEFAULT_PAGE_SIZE;
    const offset = options?.offset ?? 0;
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > this.MAX_PAGE_SIZE ||
      !Number.isInteger(offset) ||
      offset < 0 ||
      offset > 2147483647
    ) {
      throw new PaginationValidationError();
    }

    const [rows, total] = await Promise.all([
      readPage({ take: limit, skip: offset }),
      count(),
    ]);

    return {
      items: rows.map(mapper),
      total,
      limit,
      offset,
      hasMore: offset + rows.length < total,
    };
  }
}
