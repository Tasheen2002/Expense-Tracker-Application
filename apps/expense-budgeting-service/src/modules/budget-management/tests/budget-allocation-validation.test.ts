import { describe, expect, it } from "vitest";
import {
  addAllocationSchema,
  updateAllocationSchema,
} from "../infrastructure/http/validation/budget.schema";
import { ALLOCATION_DESCRIPTION_MAX_LENGTH } from "../domain/constants/budget.constants";

describe("allocation description validation", () => {
  it("accepts the database column limit and rejects longer descriptions", () => {
    const withinLimit = "a".repeat(ALLOCATION_DESCRIPTION_MAX_LENGTH);
    const overLimit = `${withinLimit}a`;

    expect(addAllocationSchema.safeParse({
      allocatedAmount: 1,
      description: withinLimit,
    }).success).toBe(true);
    expect(addAllocationSchema.safeParse({
      allocatedAmount: 1,
      description: overLimit,
    }).success).toBe(false);
    expect(updateAllocationSchema.safeParse({ description: overLimit }).success)
      .toBe(false);
  });
});
