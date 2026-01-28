export class ConfidenceScore {
  private constructor(private readonly value: number) {
    if (value < 0 || value > 1) {
      throw new Error('Confidence score must be between 0 and 1')
    }
  }

  static create(value: number): ConfidenceScore {
    return new ConfidenceScore(value)
  }

  static low(): ConfidenceScore {
    return new ConfidenceScore(0.33)
  }

  static medium(): ConfidenceScore {
    return new ConfidenceScore(0.66)
  }

  static high(): ConfidenceScore {
    return new ConfidenceScore(0.9)
  }

  getValue(): number {
    return this.value
  }

  isHigh(): boolean {
    return this.value >= 0.75
  }

  isMedium(): boolean {
    return this.value >= 0.5 && this.value < 0.75
  }

  isLow(): boolean {
    return this.value < 0.5
  }

  getLabel(): string {
    if (this.isHigh()) return 'High'
    if (this.isMedium()) return 'Medium'
    return 'Low'
  }

  equals(other: ConfidenceScore): boolean {
    return Math.abs(this.value - other.value) < 0.001
  }

  toString(): string {
    return `${(this.value * 100).toFixed(1)}%`
  }
}
