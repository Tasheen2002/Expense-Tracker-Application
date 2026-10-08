import { InvalidConfidenceScoreError } from "../errors/categorization-rules.errors";

export class ConfidenceScore {
  private constructor(private readonly value: number) {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new InvalidConfidenceScoreError(
        `Confidence score must be between 0 and 1, got ${value}`,
      );
    }
    Object.freeze(this);
  }

  static create(value: number): ConfidenceScore {
    return new ConfidenceScore(value);
  }

  static low(): ConfidenceScore {
    return new ConfidenceScore(0.33);
  }

  static medium(): ConfidenceScore {
    return new ConfidenceScore(0.66);
  }

  static high(): ConfidenceScore {
    return new ConfidenceScore(0.9);
  }

  getValue(): number {
    return this.value;
  }

  isHigh(): boolean {
    return this.value >= 0.75;
  }

  isMedium(): boolean {
    return this.value >= 0.5 && this.value < 0.75;
  }

  isLow(): boolean {
    return this.value < 0.5;
  }

  getLabel(): string {
    if (this.isHigh()) return "High";
    if (this.isMedium()) return "Medium";
    return "Low";
  }

  equals(other: ConfidenceScore | null | undefined): boolean {
    return other instanceof ConfidenceScore && this.value === other.value;
  }

  toString(): string {
    return `${(this.value * 100).toFixed(1)}%`;
  }
}
