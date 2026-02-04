import { ReceiptService } from "../services/receipt.service";
import { Receipt } from "../../domain/entities/receipt.entity";
import { ReceiptStatus } from "../../domain/enums/receipt-status";
import { ReceiptType } from "../../domain/enums/receipt-type";

export interface ListReceiptsDto {
  workspaceId: string;
  userId?: string;
  expenseId?: string;
  status?: ReceiptStatus;
  receiptType?: ReceiptType;
  isLinked?: boolean;
  isDeleted?: boolean;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

import { PaginatedResult } from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export class ListReceiptsHandler {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(dto: ListReceiptsDto): Promise<PaginatedResult<Receipt>> {
    return await this.receiptService.filterReceipts(
      {
        workspaceId: dto.workspaceId,
        userId: dto.userId,
        expenseId: dto.expenseId,
        status: dto.status,
        receiptType: dto.receiptType,
        isLinked: dto.isLinked,
        isDeleted: dto.isDeleted,
        fromDate: dto.fromDate,
        toDate: dto.toDate,
      },
      {
        limit: dto.limit,
        offset: dto.offset,
      },
    );
  }
}
