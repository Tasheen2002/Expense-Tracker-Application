export class ExpenseDate {
  private readonly value: Date

  private constructor(value: Date) {
    this.value = value
  }

  static create(date: Date | string): ExpenseDate {
    const parsedDate = typeof date === 'string' ? new Date(date) : date

    if (isNaN(parsedDate.getTime())) {
      throw new Error('Invalid date format')
    }

    // Ensure the date is not in the future
    const now = new Date()
    if (parsedDate > now) {
      throw new Error('Expense date cannot be in the future')
    }

    return new ExpenseDate(parsedDate)
  }

  static today(): ExpenseDate {
    return new ExpenseDate(new Date())
  }

  getValue(): Date {
    return this.value
  }

  isBefore(other: ExpenseDate): boolean {
    return this.value < other.value
  }

  isAfter(other: ExpenseDate): boolean {
    return this.value > other.value
  }

  equals(other: ExpenseDate): boolean {
    return this.value.getTime() === other.value.getTime()
  }

  toString(): string {
    return this.value.toISOString()
  }

  toDateString(): string {
    return this.value.toISOString().split('T')[0]
  }
}
