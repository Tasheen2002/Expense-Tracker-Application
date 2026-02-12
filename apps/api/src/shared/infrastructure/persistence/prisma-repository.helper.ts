import {
  PaginatedResult,
  PaginationOptions,
} from "../../domain/interfaces/paginated-result.interface";

export class PrismaRepositoryHelper {
  private static readonly MAX_PAGE_SIZE = 100;
  private static readonly DEFAULT_PAGE_SIZE = 50;

  /**
   * Helper to paginate Prisma queries.
   *
   * @param model - The Prisma delegate (e.g., prisma.user)
   * @param args - The arguments for findMany (where, include, orderBy, etc.)
   * @param mapper - Function to map the raw Prisma result to the Domain entity
   * @param options - Pagination options (limit, offset)
   * @returns PaginatedResult<DomainEntity>
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma delegates use branded types incompatible with strict generics
  static async paginate<TPrismaModel, TDomainEntity>(
    model: {
      findMany: (args: any) => Promise<TPrismaModel[]>;
      count: (args: any) => Promise<number>;
    },
    args: { where?: Record<string, unknown>; orderBy?: unknown; include?: unknown },
    mapper: (record: TPrismaModel) => TDomainEntity,
    options?: PaginationOptions,
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
