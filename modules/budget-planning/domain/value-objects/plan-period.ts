export class PlanPeriod {
  private constructor(
    private readonly startDate: Date,
    private readonly endDate: Date,
  ) {
    if (endDate <= startDate) {
      throw new Error("End date must be after start date");
    }
  }

  static create(startDate: Date, endDate: Date): PlanPeriod {
    return new PlanPeriod(startDate, endDate);
  }

  getStartDate(): Date {
    return this.startDate;
  }

  getEndDate(): Date {
    return this.endDate;
  }

  contains(date: Date): boolean {
    return date >= this.startDate && date <= this.endDate;
  }

  overlaps(other: PlanPeriod): boolean {
    return this.startDate < other.endDate && other.startDate < this.endDate;
  }

  getDurationInDays(): number {
    const diffTime = Math.abs(
      this.endDate.getTime() - this.startDate.getTime(),
    );
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
