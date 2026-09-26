import { SplitId } from '../value-objects/split-id';
import { ExpenseId } from '../value-objects/expense-id';
import { Money } from '../value-objects/money';
import { SplitType } from '../enums/split-type';
import { SplitParticipant } from './split-participant.entity';
import { AggregateRoot } from '@core/domain/aggregate-root';
import { DomainEvent } from '@core/domain/events/domain-event';
import { EXPENSE_EVENTS } from '@shared/events/expense-events';
import {
  InvalidSplitAmountError,
  InvalidSplitPercentageError,
  InsufficientParticipantsError,
} from '../errors/split-expense.errors';
import { Decimal } from 'decimal.js'; // Decimal used only for arithmetic

export interface ExpenseSplitParticipantDTO {
  id: string;
  userId: string;
  shareAmount: string;
  sharePercentage?: number;
  isPaid: boolean;
  paidAt?: string;
}

export interface ExpenseSplitDTO {
  id: string;
  expenseId: string;
  workspaceId: string;
  paidBy: string;
  totalAmount: string;
  currency: string;
  splitType: string;
  participants: ExpenseSplitParticipantDTO[];
  isFullySettled: boolean;
  outstandingAmount: string;
  createdAt: string;
  updatedAt: string;
}

export class ExpenseSplitCreatedEvent extends DomainEvent {
  constructor(
    public readonly splitId: string,
    public readonly expenseId: string,
    public readonly workspaceId: string,
    public readonly splitType: string,
    public readonly participantCount: number
  ) {
    super(splitId, 'ExpenseSplit');
  }
  get eventType(): string { return EXPENSE_EVENTS.SPLIT_CREATED; }
  getPayload(): Record<string, unknown> {
    return { splitId: this.splitId, expenseId: this.expenseId, workspaceId: this.workspaceId, splitType: this.splitType, participantCount: this.participantCount };
  }
}

export class ExpenseSplitDeletedEvent extends DomainEvent {
  constructor(
    public readonly splitId: string,
    public readonly expenseId: string,
    public readonly workspaceId: string
  ) {
    super(splitId, 'ExpenseSplit');
  }
  get eventType(): string { return EXPENSE_EVENTS.SPLIT_DELETED; }
  getPayload(): Record<string, unknown> {
    return { splitId: this.splitId, expenseId: this.expenseId, workspaceId: this.workspaceId };
  }
}

export interface ExpenseSplitProps {
  id: SplitId;
  expenseId: ExpenseId;
  workspaceId: string;
  paidBy: string;
  totalAmount: Money;
  splitType: SplitType;
  participants: SplitParticipant[];
  createdAt: Date;
  updatedAt: Date;
}

export class ExpenseSplit extends AggregateRoot {
  private constructor(private props: ExpenseSplitProps) {
    super();
  }

  static create(params: {
    expenseId: ExpenseId;
    workspaceId: string;
    paidBy: string;
    totalAmount: Money;
    splitType: SplitType;
    participants: Array<{
      userId: string;
      shareAmount?: Money;
      sharePercentage?: number;
    }>;
  }): ExpenseSplit {
    if (params.participants.length < 2) {
      throw new InsufficientParticipantsError();
    }

    if (params.totalAmount.getAmount().isZero() || params.totalAmount.getAmount().isNegative()) {
      throw new InvalidSplitAmountError('Total split amount must be greater than zero');
    }

    // Reject duplicate participant user IDs
    const userIds = new Set<string>();
    for (const p of params.participants) {
      if (userIds.has(p.userId)) {
        throw new InvalidSplitAmountError(
          `Duplicate participant user ID: ${p.userId}`
        );
      }
      userIds.add(p.userId);
    }

    const splitId = SplitId.create();
    const currency = params.totalAmount.getCurrency();
    const totalAmountDecimal = new Decimal(params.totalAmount.getAmount());

    let participantEntities: SplitParticipant[] = [];

    if (params.splitType === SplitType.EQUAL) {
      participantEntities = ExpenseSplit.allocateEqual(
        splitId, totalAmountDecimal, currency, params.participants
      );
    } else if (params.splitType === SplitType.EXACT) {
      participantEntities = ExpenseSplit.allocateExact(
        splitId, totalAmountDecimal, currency, params.participants
      );
    } else if (params.splitType === SplitType.PERCENTAGE) {
      participantEntities = ExpenseSplit.allocatePercentage(
        splitId, totalAmountDecimal, currency, params.participants
      );
    }

    const split = new ExpenseSplit({
      id: splitId,
      expenseId: params.expenseId,
      workspaceId: params.workspaceId,
      paidBy: params.paidBy,
      totalAmount: params.totalAmount,
      splitType: params.splitType,
      participants: participantEntities,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    split.addDomainEvent(
      new ExpenseSplitCreatedEvent(
        split.props.id.getValue(),
        split.props.expenseId.getValue(),
        split.props.workspaceId,
        split.props.splitType,
        split.props.participants.length
      )
    );

    return split;
  }

  /**
   * Deterministic minor-unit allocation for equal splits.
   * Divides in cents, distributes remainder to earliest participants.
   * Example: 10.00 / 3 → [3.34, 3.33, 3.33]
   */
  private static allocateEqual(
    splitId: SplitId,
    totalAmount: Decimal,
    currency: string,
    participants: Array<{ userId: string }>
  ): SplitParticipant[] {
    const count = participants.length;
    // Convert to minor units (cents) for integer division
    const totalCents = totalAmount.times(100).toNumber();
    const baseCents = Math.floor(totalCents / count);
    const remainderCents = totalCents - (baseCents * count);

    // Distribute 10,000 basis points deterministically so percentages sum to exactly 100.00%
    const totalBasisPoints = 10000;
    const baseBasisPoints = Math.floor(totalBasisPoints / count);
    const remainderBasisPoints = totalBasisPoints - (baseBasisPoints * count);

    return participants.map((p, index) => {
      const cents = baseCents + (index < remainderCents ? 1 : 0);
      const shareDecimal = new Decimal(cents).dividedBy(100);

      const basisPoints = baseBasisPoints + (index < remainderBasisPoints ? 1 : 0);
      const sharePercentage = new Decimal(basisPoints).dividedBy(100).toNumber();

      return SplitParticipant.create({
        splitId,
        userId: p.userId,
        shareAmount: Money.create(shareDecimal.toNumber(), currency),
        sharePercentage,
      });
    });
  }

  /**
   * Exact split allocation — validates that participant amounts sum to the total.
   */
  private static allocateExact(
    splitId: SplitId,
    totalAmount: Decimal,
    currency: string,
    participants: Array<{ userId: string; shareAmount?: Money }>
  ): SplitParticipant[] {
    const totalSpecified = participants.reduce((sum, p) => {
      if (!p.shareAmount) {
        throw new InvalidSplitAmountError(
          'Share amount required for EXACT split type'
        );
      }
      if (p.shareAmount.getCurrency() !== currency) {
        throw new InvalidSplitAmountError(
          `Participant share currency (${p.shareAmount.getCurrency()}) does not match expense currency (${currency})`
        );
      }
      return sum.plus(p.shareAmount.getAmount());
    }, new Decimal(0));

    if (!totalSpecified.equals(totalAmount)) {
      throw new InvalidSplitAmountError(
        `Total split amounts (${totalSpecified}) must equal expense total (${totalAmount})`
      );
    }

    // Distribute 10,000 basis points deterministically so percentages sum to exactly 100.00%
    const totalBasisPoints = 10000;
    const rawBasisPoints = participants.map((p) =>
      new Decimal(p.shareAmount!.getAmount())
        .dividedBy(totalAmount)
        .times(totalBasisPoints)
    );
    const flooredBasisPoints = rawBasisPoints.map((bp) => Math.floor(bp.toNumber()));
    const sumFloored = flooredBasisPoints.reduce((a, b) => a + b, 0);
    let remainderBasisPoints = totalBasisPoints - sumFloored;

    const fractionalParts = rawBasisPoints.map((bp, i) => ({
      index: i,
      fractional: bp.toNumber() - flooredBasisPoints[i],
    }));
    fractionalParts.sort((a, b) => b.fractional - a.fractional);

    const finalBasisPoints = [...flooredBasisPoints];
    for (const fp of fractionalParts) {
      if (remainderBasisPoints <= 0) break;
      finalBasisPoints[fp.index] += 1;
      remainderBasisPoints -= 1;
    }

    return participants.map((p, index) => {
      const sharePercentage = new Decimal(finalBasisPoints[index]).dividedBy(100).toNumber();

      return SplitParticipant.create({
        splitId,
        userId: p.userId,
        shareAmount: p.shareAmount!,
        sharePercentage,
      });
    });
  }

  /**
   * Percentage-based split with deterministic remainder distribution.
   * Converts percentages to cent amounts, then distributes rounding remainder.
   */
  private static allocatePercentage(
    splitId: SplitId,
    totalAmount: Decimal,
    currency: string,
    participants: Array<{ userId: string; sharePercentage?: number }>
  ): SplitParticipant[] {
    const totalPercentage = participants.reduce((sum, p) => {
      if (!p.sharePercentage) {
        throw new InvalidSplitPercentageError(0);
      }
      return sum.plus(p.sharePercentage);
    }, new Decimal(0));

    if (!totalPercentage.equals(100)) {
      throw new InvalidSplitPercentageError(totalPercentage.toNumber());
    }

    // Calculate raw cent amounts and floor each
    const totalCents = totalAmount.times(100).toNumber();
    const rawCents = participants.map((p) =>
      new Decimal(totalCents).times(p.sharePercentage!).dividedBy(100)
    );
    const flooredCents = rawCents.map((c) => Math.floor(c.toNumber()));
    const sumFloored = flooredCents.reduce((a, b) => a + b, 0);
    let remainderCents = totalCents - sumFloored;

    // Distribute remainder to participants with the largest fractional parts
    const fractionalParts = rawCents.map((c, i) => ({
      index: i,
      fractional: c.toNumber() - flooredCents[i],
    }));
    fractionalParts.sort((a, b) => b.fractional - a.fractional);

    const finalCents = [...flooredCents];
    for (const fp of fractionalParts) {
      if (remainderCents <= 0) break;
      finalCents[fp.index] += 1;
      remainderCents -= 1;
    }

    return participants.map((p, index) => {
      const shareDecimal = new Decimal(finalCents[index]).dividedBy(100);

      return SplitParticipant.create({
        splitId,
        userId: p.userId,
        shareAmount: Money.create(shareDecimal.toNumber(), currency),
        sharePercentage: p.sharePercentage,
      });
    });
  }

  static fromPersistence(props: ExpenseSplitProps): ExpenseSplit {
    return new ExpenseSplit(props);
  }

  get id(): SplitId { return this.props.id; }
  get expenseId(): ExpenseId { return this.props.expenseId; }
  get workspaceId(): string { return this.props.workspaceId; }
  get paidBy(): string { return this.props.paidBy; }
  get totalAmount(): Money { return this.props.totalAmount; }
  get splitType(): SplitType { return this.props.splitType; }
  get participants(): readonly SplitParticipant[] {
    return this.props.participants.map((p) => p.clone());
  }
  get createdAt(): Date {
    return new Date(this.props.createdAt.getTime());
  }
  get updatedAt(): Date {
    return new Date(this.props.updatedAt.getTime());
  }

  getParticipantByUserId(userId: string): SplitParticipant | undefined {
    const participant = this.props.participants.find((p) => p.userId === userId);
    return participant ? participant.clone() : undefined;
  }

  markParticipantAsPaid(userId: string): void {
    const participant = this.props.participants.find((p) => p.userId === userId);
    if (participant) {
      participant.markAsPaid();
      this.props.updatedAt = new Date();
    }
  }

  markParticipantAsUnpaid(userId: string): void {
    const participant = this.props.participants.find((p) => p.userId === userId);
    if (participant) {
      participant.markAsUnpaid();
      this.props.updatedAt = new Date();
    }
  }

  isParticipant(userId: string): boolean {
    return this.props.participants.some((p) => p.userId === userId);
  }

  markAsDeleted(): void {
    this.addDomainEvent(
      new ExpenseSplitDeletedEvent(
        this.props.id.getValue(),
        this.props.expenseId.getValue(),
        this.props.workspaceId
      )
    );
  }

  isFullySettled(): boolean {
    return this.props.participants
      .filter((p) => p.userId !== this.props.paidBy)
      .every((p) => p.isPaid);
  }

  getOutstandingAmount(): Money {
    const outstanding = this.props.participants
      .filter((p) => p.userId !== this.props.paidBy && !p.isPaid)
      .reduce(
        (sum, p) => sum.plus(p.shareAmount.getAmount()),
        new Decimal(0)
      );

    return Money.create(
      outstanding.toNumber(),
      this.props.totalAmount.getCurrency()
    );
  }

  static toDTO(split: ExpenseSplit): ExpenseSplitDTO {
    return {
      id: split.props.id.getValue(),
      expenseId: split.props.expenseId.getValue(),
      workspaceId: split.props.workspaceId,
      paidBy: split.props.paidBy,
      totalAmount: split.props.totalAmount.getAmount().toString(),
      currency: split.props.totalAmount.getCurrency(),
      splitType: split.props.splitType,
      participants: split.props.participants.map((p) => ({
        id: p.id.getValue(),
        userId: p.userId,
        shareAmount: p.shareAmount.getAmount().toString(),
        sharePercentage: p.sharePercentage,
        isPaid: p.isPaid,
        paidAt: p.paidAt?.toISOString(),
      })),
      isFullySettled: split.isFullySettled(),
      outstandingAmount: split.getOutstandingAmount().getAmount().toString(),
      createdAt: split.props.createdAt.toISOString(),
      updatedAt: split.props.updatedAt.toISOString(),
    };
  }
}

