import {
  PaginatedResult,
  PaginationOptions,
} from "../../domain/interfaces/paginated-result.interface";

export class PrismaRepositoryHelper {
  /**
   * Helper to paginate Prisma queries.
   *
   * @param model - The Prisma delegate (e.g., prisma.user)
   * @param args - The arguments for findMany (where, include, orderBy, etc.)
   * @param mapper - Function to map the raw Prisma result to the Domain entity
   * @param options - Pagination options (limit, offset)
   * @returns PaginatedResult<DomainEntity>
   */
  static async paginate<TPrismaModel, TDomainEntity>(
    model: {
      findMany: (args: any) => Promise<TPrismaModel[]>;
      count: (args: any) => Promise<number>;
    },
    args: any,
    mapper: (record: TPrismaModel) => TDomainEntity,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<TDomainEntity>> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

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
