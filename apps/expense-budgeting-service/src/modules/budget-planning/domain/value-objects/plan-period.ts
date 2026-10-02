import { InvalidPlanPeriodError } from "../errors/budget-planning.errors";

export class PlanPeriod {
  private readonly _startDate: Date;
  private readonly _endDate: Date;

  private constructor(startDate: Date, endDate: Date) {
    if (!startDate || !endDate) {
      throw new InvalidPlanPeriodError("Start date and end date are required");
    }

    const start = new Date(startDate.getTime());
    const end = new Date(endDate.getTime());

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new InvalidPlanPeriodError("Start date and end date must be valid dates");
    }

    if (end.getTime() <= start.getTime()) {
      throw new InvalidPlanPeriodError("End date must be after start date");
    }

    this._startDate = start;
    this._endDate = end;
  }

  static create(startDate: Date, endDate: Date): PlanPeriod {
    return new PlanPeriod(startDate, endDate);
  }

  /**
   * Normalizes any Date instance to UTC midnight (00:00:00.000Z) to conform to the PostgreSQL `@db.Date` contract.
   */
  static normalizeToUtcMidnight(date: Date): Date {
    if (!date || isNaN(date.getTime())) {
      throw new InvalidPlanPeriodError("Cannot normalize an invalid date");
    }
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
  }

  /**
   * Creates a PlanPeriod normalized strictly to UTC calendar date boundaries (midnight UTC).
   */
  static createDateOnly(startDate: Date, endDate: Date): PlanPeriod {
    const normalizedStart = PlanPeriod.normalizeToUtcMidnight(startDate);
    const normalizedEnd = PlanPeriod.normalizeToUtcMidnight(endDate);
    if (normalizedEnd.getTime() <= normalizedStart.getTime()) {
      throw new InvalidPlanPeriodError("Start date and end date must fall on different calendar days for date-only period");
    }
    return new PlanPeriod(normalizedStart, normalizedEnd);
  }

  get startDate(): Date {
    return new Date(this._startDate.getTime());
  }

  get endDate(): Date {
    return new Date(this._endDate.getTime());
  }

  get startDateOnly(): string {
    return this._startDate.toISOString().split("T")[0];
  }

  get endDateOnly(): string {
    return this._endDate.toISOString().split("T")[0];
  }

  /**
   * Indicates whether both startDate and endDate align with UTC calendar midnight boundaries (00:00:00.000Z).
   */
  isDateOnly(): boolean {
    return (
      this._startDate.getUTCHours() === 0 &&
      this._startDate.getUTCMinutes() === 0 &&
      this._startDate.getUTCSeconds() === 0 &&
      this._startDate.getUTCMilliseconds() === 0 &&
      this._endDate.getUTCHours() === 0 &&
      this._endDate.getUTCMinutes() === 0 &&
      this._endDate.getUTCSeconds() === 0 &&
      this._endDate.getUTCMilliseconds() === 0
    );
  }

  /**
   * Indicates whether the period starts and ends on the same calendar day (intraday).
   */
  isIntraday(): boolean {
    return this.startDateOnly === this.endDateOnly;
  }

  /**
   * Checks whether a date's exact timestamp falls within the start and end timestamps.
   */
  containsInstant(date: Date): boolean {
    if (!date || isNaN(date.getTime())) return false;
    const time = date.getTime();
    return time >= this._startDate.getTime() && time <= this._endDate.getTime();
  }

  /**
   * Checks whether a date's UTC calendar date falls within the start and end calendar days (inclusive).
   */
  containsDate(date: Date): boolean {
    if (!date || isNaN(date.getTime())) return false;
    const dateOnlyStr = date.toISOString().split("T")[0];
    return dateOnlyStr >= this.startDateOnly && dateOnlyStr <= this.endDateOnly;
  }

  /**
   * Checks whether a date is contained within this period.
   * For date-only periods (e.g. Budget Plans), checks inclusive calendar date boundaries.
   * For instant-based periods, checks exact timestamp boundaries.
   */
  contains(date: Date): boolean {
    if (!date || isNaN(date.getTime())) return false;
    if (this.isDateOnly()) {
      return this.containsDate(date);
    }
    return this.containsInstant(date);
  }

  overlaps(other: PlanPeriod): boolean {
    if (!other || !(other instanceof PlanPeriod)) return false;
    if (this.isDateOnly() && other.isDateOnly()) {
      return (
        this.startDateOnly <= other.endDateOnly &&
        other.startDateOnly <= this.endDateOnly
      );
    }
    return (
      this._startDate.getTime() <= other._endDate.getTime() &&
      other._startDate.getTime() <= this._endDate.getTime()
    );
  }

  equals(other: PlanPeriod | null | undefined): boolean {
    if (!other || !(other instanceof PlanPeriod)) return false;
    return (
      this._startDate.getTime() === other._startDate.getTime() &&
      this._endDate.getTime() === other._endDate.getTime()
    );
  }

  isSameDateRange(other: PlanPeriod | null | undefined): boolean {
    if (!other || !(other instanceof PlanPeriod)) return false;
    return this.startDateOnly === other.startDateOnly && this.endDateOnly === other.endDateOnly;
  }

  /**
   * Returns elapsed 24-hour days between start and end timestamps.
   */
  getDurationInDays(): number {
    const diffTime = Math.abs(
      this._endDate.getTime() - this._startDate.getTime(),
    );
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Returns the count of inclusive calendar days represented by this period.
   * For date-only periods, every calendar day in the range is counted inclusively (e.g. Jan 1 to Jan 31 is 31 days).
   */
  getInclusiveDurationInDays(): number {
    if (this.isDateOnly()) {
      return this.getDurationInDays() + 1;
    }
    return this.getDurationInDays();
  }

  toString(): string {
    return `${this.startDateOnly} to ${this.endDateOnly}`;
  }
}
