export class SplitExpenseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class SplitNotFoundError extends SplitExpenseError {
  constructor(splitId: string) {
    super(`Split with ID ${splitId} not found`, "SPLIT_NOT_FOUND", 404);
  }
}

export class InvalidSplitTypeError extends SplitExpenseError {
  constructor(splitType: string) {
    super(`Invalid split type: ${splitType}`, "INVALID_SPLIT_TYPE", 400);
  }
}

export class InvalidSplitAmountError extends SplitExpenseError {
  constructor(reason: string) {
    super(
      `Invalid split amount: ${reason}`,
      "INVALID_SPLIT_AMOUNT",
      400,
    );
  }
}

export class InvalidSplitPercentageError extends SplitExpenseError {
  constructor(totalPercentage: number) {
    super(
      `Total split percentage must be 100%, got ${totalPercentage}%`,
      "INVALID_SPLIT_PERCENTAGE",
      400,
    );
  }
}

export class SplitParticipantNotFoundError extends SplitExpenseError {
  constructor(participantId: string) {
    super(
      `Split participant with ID ${participantId} not found`,
      "SPLIT_PARTICIPANT_NOT_FOUND",
      404,
    );
  }
}

export class SettlementNotFoundError extends SplitExpenseError {
  constructor(settlementId: string) {
    super(
      `Settlement with ID ${settlementId} not found`,
      "SETTLEMENT_NOT_FOUND",
      404,
    );
  }
}

export class InvalidSettlementAmountError extends SplitExpenseError {
  constructor(reason: string) {
    super(
      `Invalid settlement amount: ${reason}`,
      "INVALID_SETTLEMENT_AMOUNT",
      400,
    );
  }
}

export class UnauthorizedSplitAccessError extends SplitExpenseError {
  constructor(splitId: string, userId: string) {
    super(
      `User ${userId} is not authorized to access split ${splitId}`,
      "UNAUTHORIZED_SPLIT_ACCESS",
      403,
    );
  }
}

export class ExpenseAlreadySplitError extends SplitExpenseError {
  constructor(expenseId: string) {
    super(
      `Expense ${expenseId} is already split`,
      "EXPENSE_ALREADY_SPLIT",
      409,
    );
  }
}

export class InsufficientParticipantsError extends SplitExpenseError {
  constructor() {
    super(
      "At least 2 participants are required for a split expense",
      "INSUFFICIENT_PARTICIPANTS",
      400,
    );
  }
}
