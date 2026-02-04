import { CostCenter } from "../entities/cost-center.entity";
import { CostCenterId } from "../value-objects/cost-center-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export interface CostCenterRepository {
  save(costCenter: CostCenter): Promise<void>;
  findById(id: CostCenterId): Promise<CostCenter | null>;
  findByCode(
    code: string,
    workspaceId: WorkspaceId,
  ): Promise<CostCenter | null>;
  findAll(
    workspaceId: WorkspaceId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<CostCenter>>;
  delete(id: CostCenterId, workspaceId: WorkspaceId): Promise<void>;
}
