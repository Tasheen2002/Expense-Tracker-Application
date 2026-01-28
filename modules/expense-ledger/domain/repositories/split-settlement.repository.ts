import { SplitSettlement } from "../entities/split-settlement.entity";
import { SettlementId } from "../value-objects/settlement-id";
import { SplitId } from "../value-objects/split-id";
import { SettlementStatus } from "../enums/settlement-status";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export interface SplitSettlementRepository {
  save(settlement: SplitSettlement): Promise<void>;
  findById(
    id: SettlementId,
    workspaceId: string,
  ): Promise<SplitSettlement | null>;
  findBySplitId(
    splitId: SplitId,
    workspaceId: string,
  ): Promise<SplitSettlement[]>;
  findByUser(
    userId: string,
    workspaceId: string,
    status?: SettlementStatus,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<SplitSettlement>>;
  findPendingForUser(
    userId: string,
    workspaceId: string,
  ): Promise<SplitSettlement[]>;
  delete(id: SettlementId, workspaceId: string): Promise<void>;
}
