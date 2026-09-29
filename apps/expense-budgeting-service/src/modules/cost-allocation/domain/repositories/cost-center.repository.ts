import { CostCenter } from "../entities/cost-center.entity";
import { CostCenterId } from "../value-objects/cost-center-id";
import {  WorkspaceId  } from '@core/domain/value-objects';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export interface ICostCenterRepository {
  save(costCenter: CostCenter): Promise<void>;
  /** Includes inactive cost centers so they can be reactivated. */
  findById(id: CostCenterId, workspaceId: WorkspaceId): Promise<CostCenter | null>;
  /** Codes remain reserved while a cost center is inactive. */
  findByCode(
    code: string,
    workspaceId: WorkspaceId,
  ): Promise<CostCenter | null>;
  /** Includes active and inactive cost centers in a deterministic order. */
  findAll(
    workspaceId: WorkspaceId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<CostCenter>>;
}
