import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export interface PrismaPaginationQueryArgs<TWhere = unknown, TOrderBy = unknown, TInclude = unknown> {
  where?: TWhere;
  orderBy?: TOrderBy;
  include?: TInclude;
  take?: number;
  skip?: number;
}

export interface PrismaPaginationCountArgs<TWhere = unknown> {
  where?: TWhere;
}

export class PrismaRepositoryHelper {
  private static readonly MAX_PAGE_SIZE = 100;
  private static readonly DEFAULT_PAGE_SIZE = 50;

  static async paginate<
    TPrismaModel,
    TDomainEntity,
    TWhere = unknown,
    TOrderBy = unknown,
    TInclude = unknown
  >(
    model: {
      findMany: (args: PrismaPaginationQueryArgs<TWhere, TOrderBy, TInclude>) => Promise<TPrismaModel[]>;
      count: (args?: PrismaPaginationCountArgs<TWhere>) => Promise<number>;
    },
    args: {
      where?: TWhere;
      orderBy?: TOrderBy;
      include?: TInclude;
    },
    mapper: (record: TPrismaModel) => TDomainEntity,
    options?: PaginationOptions
  ): Promise<PaginatedResult<TDomainEntity>> {
    const requestedLimit = options?.limit || this.DEFAULT_PAGE_SIZE;
    const limit = Math.min(Math.max(1, requestedLimit), this.MAX_PAGE_SIZE);
    const offset = Math.max(0, options?.offset || 0);

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
