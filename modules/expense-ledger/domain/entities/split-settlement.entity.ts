import { SettlementId } from "../value-objects/settlement-id";
import { SplitId } from "../value-objects/split-id";
import { Money } from "../value-objects/money";
import { SettlementStatus } from "../enums/settlement-status";
import { InvalidSettlementAmountError } from "../errors/split-expense.errors";
import { Decimal } from "@prisma/client/runtime/library";

export interface SplitSettlementProps {
  id: SettlementId;
  splitId: SplitId;
  fromUserId: string;
  toUserId: string;
  totalOwedAmount: Money;
  paidAmount: Money;
  status: SettlementStatus;
  settledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class SplitSettlement {
  private constructor(private props: SplitSettlementProps) {}

  static create(params: {
    splitId: SplitId;
    fromUserId: string;
    toUserId: string;
    owedAmount: Money;
  }): SplitSettlement {
    return new SplitSettlement({
      id: SettlementId.create(),
      splitId: params.splitId,
      fromUserId: params.fromUserId,
      toUserId: params.toUserId,
      totalOwedAmount: params.owedAmount,
      paidAmount: Money.create(0, params.owedAmount.getCurrency()),
      status: SettlementStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: SplitSettlementProps): SplitSettlement {
    return new SplitSettlement(props);
  }

  getId(): SettlementId {
    return this.props.id;
  }

  getSplitId(): SplitId {
    return this.props.splitId;
  }

  getFromUserId(): string {
    return this.props.fromUserId;
  }

  getToUserId(): string {
    return this.props.toUserId;
  }

  getTotalOwedAmount(): Money {
    return this.props.totalOwedAmount;
  }

  getPaidAmount(): Money {
    return this.props.paidAmount;
  }

  getStatus(): SettlementStatus {
    return this.props.status;
  }

  getSettledAt(): Date | undefined {
    return this.props.settledAt;
  }

  getCreatedAt(): Date {
    return this.props.createdAt;
  }

  getUpdatedAt(): Date {
    return this.props.updatedAt;
  }

  getRemainingAmount(): Money {
    const remaining = new Decimal(this.props.totalOwedAmount.getAmount()).minus(
      this.props.paidAmount.getAmount(),
    );

    return Money.create(
      remaining.toNumber(),
      this.props.totalOwedAmount.getCurrency(),
    );
  }

  recordPayment(amount: Money): void {
    const newPaidAmount = new Decimal(this.props.paidAmount.getAmount()).plus(
      amount.getAmount(),
    );

    if (
      newPaidAmount.greaterThan(this.props.totalOwedAmount.getAmount())
    ) {
      throw new InvalidSettlementAmountError(
        `Payment amount ${newPaidAmount} exceeds owed amount ${this.props.totalOwedAmount.getAmount()}`,
      );
    }

    this.props.paidAmount = Money.create(
      newPaidAmount.toNumber(),
      this.props.totalOwedAmount.getCurrency(),
    );

    if (newPaidAmount.equals(this.props.totalOwedAmount.getAmount())) {
      this.props.status = SettlementStatus.SETTLED;
      this.props.settledAt = new Date();
    } else if (newPaidAmount.greaterThan(0)) {
      this.props.status = SettlementStatus.PARTIAL;
    }

    this.props.updatedAt = new Date();
  }

  isSettled(): boolean {
    return this.props.status === SettlementStatus.SETTLED;
  }
}
