import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export class PrismaRepositoryHelper {
  static async paginate<TRow, TEntity>(
    readPage: (page: { take: number; skip: number }) => Promise<TRow[]>,
    count: () => Promise<number>,
    mapper: (row: TRow) => TEntity,
    options?: PaginationOptions
  ): Promise<PaginatedResult<TEntity>> {
    const requestedLimit = options?.limit ?? 50;
    const requestedOffset = options?.offset ?? 0;
    if (
      !Number.isSafeInteger(requestedLimit) ||
      !Number.isSafeInteger(requestedOffset) ||
      requestedLimit < 1 ||
      requestedOffset < 0 ||
      requestedOffset > 2_147_483_647
    ) {
      throw new RangeError(
        'Pagination requires a positive integer limit and an offset between 0 and 2147483647'
      );
    }
    const limit = Math.min(requestedLimit, 100);
    const offset = requestedOffset;
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
