import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export class PaginationValidationError extends Error {
  readonly statusCode = 400;
  readonly code = 'INVALID_PAGINATION';
  constructor() { super('Limit must be an integer from 1 to 100; offset must be an integer from 0 to 2147483647'); }
}

export class PrismaRepositoryHelper {
  private static readonly MAX_PAGE_SIZE = 100;
  private static readonly DEFAULT_PAGE_SIZE = 50;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma delegates use branded types incompatible with strict generics
  static async paginate<TPrismaModel, TDomainEntity>(
    model: {
      findMany: (args: any) => Promise<TPrismaModel[]>;
      count: (args: any) => Promise<number>;
    },
    args: {
      where?: Record<string, unknown>;
      orderBy?: unknown;
      include?: unknown;
    },
    mapper: (record: TPrismaModel) => TDomainEntity,
    options?: PaginationOptions
  ): Promise<PaginatedResult<TDomainEntity>> {
    const limit = options?.limit ?? this.DEFAULT_PAGE_SIZE;
    const offset = options?.offset ?? 0;
    if (!Number.isInteger(limit) || limit < 1 || limit > this.MAX_PAGE_SIZE ||
        !Number.isInteger(offset) || offset < 0 || offset > 2147483647) {
      throw new PaginationValidationError();
    }

    const [rows, total] = await Promise.all([
      model.findMany({
        ...args,
        take: limit,
        skip: offset,
      }),
      model.count({ where: args.where }),
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
