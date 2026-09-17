import { Decimal } from "@prisma/client/runtime/library";

/**
 * Summary data for departments.
 */
export interface DepartmentSummary {
  id: string;
  name: string;
}

/**
 * Summary data for cost centers.
 */
export interface CostCenterSummary {
  id: string;
  name: string;
}

/**
 * Summary data for projects.
 */
export interface ProjectSummary {
  id: string;
  name: string;
}

/**
 * Aggregated allocation data by target type.
 */
export interface AllocationGroupData {
  targetId: string;
  total: Decimal;
  count: number;
}

/**
 * Port for querying allocation summary data.
 * This interface decouples the application layer from the infrastructure.
 */
export interface IAllocationSummaryPort {
  /**
   * Get allocation totals grouped by department.
   */
  getByDepartment(workspaceId: string): Promise<AllocationGroupData[]>;

  /**
   * Get allocation totals grouped by cost center.
   */
  getByCostCenter(workspaceId: string): Promise<AllocationGroupData[]>;

  /**
   * Get allocation totals grouped by project.
   */
  getByProject(workspaceId: string): Promise<AllocationGroupData[]>;

  /**
   * Get total allocation count for workspace.
   */
  getTotalCount(workspaceId: string): Promise<number>;

  /**
   * Get department names by IDs.
   */
  getDepartmentNames(ids: string[]): Promise<DepartmentSummary[]>;

  /**
   * Get cost center names by IDs.
   */
  getCostCenterNames(ids: string[]): Promise<CostCenterSummary[]>;

  /**
   * Get project names by IDs.
   */
  getProjectNames(ids: string[]): Promise<ProjectSummary[]>;
}
