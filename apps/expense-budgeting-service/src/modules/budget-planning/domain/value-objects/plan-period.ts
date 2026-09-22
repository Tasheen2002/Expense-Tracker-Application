import { InvalidPlanPeriodError } from "../errors/budget-planning.errors";

export class PlanPeriod {
  private constructor(
    private readonly _startDate: Date,
    private readonly _endDate: Date,
  ) {
    if (_endDate <= _startDate) {
      throw new InvalidPlanPeriodError("End date must be after start date");
    }
  }

  static create(startDate: Date, endDate: Date): PlanPeriod {
    return new PlanPeriod(startDate, endDate);
  }

  get startDate(): Date {
    return this._startDate;
  }

  get endDate(): Date {
    return this._endDate;
  }

  contains(date: Date): boolean {
    return date >= this._startDate && date <= this._endDate;
  }

  overlaps(other: PlanPeriod): boolean {
    return this._startDate < other._endDate && other._startDate < this._endDate;
  }

  getDurationInDays(): number {
    const diffTime = Math.abs(
      this._endDate.getTime() - this._startDate.getTime(),
    );
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
