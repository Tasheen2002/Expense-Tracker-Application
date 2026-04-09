import { SettlementId } from '../value-objects/settlement-id';
import { SplitId } from '../value-objects/split-id';
import { Money } from '../value-objects/money';
import { SettlementStatus } from '../enums/settlement-status';
import { InvalidSettlementAmountError } from '../errors/split-expense.errors';
import { Decimal } from '@prisma/client/runtime/library'; // Decimal used only for arithmetic

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

  static fromPersistence(props: SplitSettlementProps): SplitSettlement {
    return new SplitSettlement(props);
  }

  get id(): SettlementId {
    return this.props.id;
  }
  get splitId(): SplitId {
    return this.props.splitId;
  }
  get fromUserId(): string {
    return this.props.fromUserId;
  }
  get toUserId(): string {
    return this.props.toUserId;
  }
  get totalOwedAmount(): Money {
    return this.props.totalOwedAmount;
  }
  get paidAmount(): Money {
    return this.props.paidAmount;
  }
  get status(): SettlementStatus {
    return this.props.status;
  }
  get settledAt(): Date | undefined {
    return this.props.settledAt;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  getRemainingAmount(): Money {
    const remaining = new Decimal(this.props.totalOwedAmount.getAmount()).minus(
      this.props.paidAmount.getAmount()
    );

    return Money.create(
      remaining.toNumber(),
      this.props.totalOwedAmount.getCurrency()
    );
  }

  recordPayment(amount: Money): void {
    const newPaidAmount = new Decimal(this.props.paidAmount.getAmount()).plus(
      amount.getAmount()
    );

    if (newPaidAmount.greaterThan(this.props.totalOwedAmount.getAmount())) {
      throw new InvalidSettlementAmountError(
        `Payment amount ${newPaidAmount} exceeds owed amount ${this.props.totalOwedAmount.getAmount()}`
      );
    }

    this.props.paidAmount = Money.create(
      newPaidAmount.toNumber(),
      this.props.totalOwedAmount.getCurrency()
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

  toJSON(): SplitSettlementDTO {
    return {
      id: this.props.id.getValue(),
      splitId: this.props.splitId.getValue(),
      fromUserId: this.props.fromUserId,
      toUserId: this.props.toUserId,
      totalOwedAmount: this.props.totalOwedAmount.getAmount().toString(),
      paidAmount: this.props.paidAmount.getAmount().toString(),
      remainingAmount: this.getRemainingAmount().getAmount().toString(),
      currency: this.props.totalOwedAmount.getCurrency(),
      status: this.props.status,
      settledAt: this.props.settledAt?.toISOString(),
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}

export interface SplitSettlementDTO {
  id: string;
  splitId: string;
  fromUserId: string;
  toUserId: string;
  totalOwedAmount: string;
  paidAmount: string;
  remainingAmount: string;
  currency: string;
  status: string;
  settledAt?: string;
  createdAt: string;
  updatedAt: string;
}
