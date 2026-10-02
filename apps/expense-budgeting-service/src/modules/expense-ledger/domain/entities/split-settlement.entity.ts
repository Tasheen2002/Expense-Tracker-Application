import { SettlementId } from '../value-objects/settlement-id';
import { SplitId } from '../value-objects/split-id';
import { Money } from '../value-objects/money';
import { SettlementStatus } from '../enums/settlement-status';
import { InvalidSettlementAmountError } from '../errors/split-expense.errors';

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
    if (!params.owedAmount.getAmount().isPositive() || params.owedAmount.getAmount().isZero()) {
      throw new InvalidSettlementAmountError('Settlement owed amount must be greater than zero');
    }

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
    return this.props.settledAt ? new Date(this.props.settledAt.getTime()) : undefined;
  }
  get createdAt(): Date {
    return new Date(this.props.createdAt.getTime());
  }
  get updatedAt(): Date {
    return new Date(this.props.updatedAt.getTime());
  }

  getRemainingAmount(): Money {
    return this.props.totalOwedAmount.subtract(this.props.paidAmount);
  }

  recordPayment(amount: Money): void {
    if (amount.getCurrency() !== this.props.totalOwedAmount.getCurrency()) {
      throw new InvalidSettlementAmountError(
        `Payment currency (${amount.getCurrency()}) does not match settlement currency (${this.props.totalOwedAmount.getCurrency()})`
      );
    }

    if (amount.getAmount().isZero() || amount.getAmount().isNegative()) {
      throw new InvalidSettlementAmountError(
        'Payment amount must be positive'
      );
    }

    const newPaidAmount = this.props.paidAmount.add(amount);

    if (newPaidAmount.isGreaterThan(this.props.totalOwedAmount)) {
      throw new InvalidSettlementAmountError(
        `Payment amount ${amount.getAmount()} would exceed owed amount ${this.props.totalOwedAmount.getAmount()}`
      );
    }

    this.props.paidAmount = newPaidAmount;

    if (newPaidAmount.equals(this.props.totalOwedAmount)) {
      this.props.status = SettlementStatus.SETTLED;
      this.props.settledAt = new Date();
    } else {
      this.props.status = SettlementStatus.PARTIAL;
    }

    this.props.updatedAt = new Date();
  }

  isSettled(): boolean {
    return this.props.status === SettlementStatus.SETTLED;
  }

  static toDTO(settlement: SplitSettlement): SplitSettlementDTO {
    return {
      id: settlement.props.id.getValue(),
      splitId: settlement.props.splitId.getValue(),
      fromUserId: settlement.props.fromUserId,
      toUserId: settlement.props.toUserId,
      totalOwedAmount: settlement.props.totalOwedAmount.getAmount().toString(),
      paidAmount: settlement.props.paidAmount.getAmount().toString(),
      remainingAmount: settlement.getRemainingAmount().getAmount().toString(),
      currency: settlement.props.totalOwedAmount.getCurrency(),
      status: settlement.props.status,
      settledAt: settlement.props.settledAt?.toISOString(),
      createdAt: settlement.props.createdAt.toISOString(),
      updatedAt: settlement.props.updatedAt.toISOString(),
    };
  }
}
