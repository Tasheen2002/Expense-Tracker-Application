export enum SplitType {
  EQUAL = "EQUAL",
  EXACT = "EXACT",
  PERCENTAGE = "PERCENTAGE",
}

export function isValidSplitType(value: string): value is SplitType {
  return Object.values(SplitType).includes(value as SplitType);
}

