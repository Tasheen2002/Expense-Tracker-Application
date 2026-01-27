import { CostCenter } from "../entities/cost-center.entity";
import { CostCenterId } from "../value-objects/cost-center-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";

export interface CostCenterRepository {
  save(costCenter: CostCenter): Promise<void>;
  findById(id: CostCenterId): Promise<CostCenter | null>;
  findByCode(
    code: string,
    workspaceId: WorkspaceId,
  ): Promise<CostCenter | null>;
  findAll(workspaceId: WorkspaceId): Promise<CostCenter[]>;
  delete(id: CostCenterId, workspaceId: WorkspaceId): Promise<void>;
}
