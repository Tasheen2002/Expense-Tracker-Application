import Decimal from 'decimal.js';

export interface AllocationGroupData {
  targetId: string;
  targetName: string;
  currency: string;
  total: Decimal;
  count: number;
}

export interface AllocationSummarySnapshot {
  totalAllocations: number;
  byDepartment: AllocationGroupData[];
  byCostCenter: AllocationGroupData[];
  byProject: AllocationGroupData[];
}

/** All figures and names must come from one consistent database snapshot. */
export interface IAllocationSummaryPort {
  getSnapshot(workspaceId: string): Promise<AllocationSummarySnapshot>;
}
