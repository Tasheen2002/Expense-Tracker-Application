import { SplitId } from '../value-objects/split-id';
import { ExpenseId } from '../value-objects/expense-id';
import { Money } from '../value-objects/money';
import { SplitType } from '../enums/split-type';
import { SplitParticipant } from './split-participant.entity';
import { AggregateRoot } from '../../../../packages/core/src/domain/aggregate-root';
import { DomainEvent } from '../../../../packages/core/src/domain/events/domain-event';
import {
  InvalidSplitAmountError,
  InvalidSplitPercentageError,
  InsufficientParticipantsError,
} from '../errors/split-expense.errors';
import { Decimal } from '@prisma/client/runtime/library'; // Decimal used only for arithmetic

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
  get eventType(): string { return 'expense_split.created'; }
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
  get eventType(): string { return 'expense_split.deleted'; }
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

    const splitId = SplitId.create();
    const totalAmountDecimal = new Decimal(params.totalAmount.getAmount());

    let participantEntities: SplitParticipant[] = [];

    if (params.splitType === SplitType.EQUAL) {
      const shareAmount = totalAmountDecimal.dividedBy(
        params.participants.length
      );

      participantEntities = params.participants.map((p) =>
        SplitParticipant.create({
          splitId,
          userId: p.userId,
          shareAmount: Money.create(
            shareAmount.toNumber(),
            params.totalAmount.getCurrency()
          ),
          sharePercentage: new Decimal(100).dividedBy(
            params.participants.length
          ).toNumber(),
        })
      );
    } else if (params.splitType === SplitType.EXACT) {
      const totalSpecified = params.participants.reduce((sum, p) => {
        if (!p.shareAmount) {
          throw new InvalidSplitAmountError(
            'Share amount required for EXACT split type'
          );
        }
        return sum.plus(p.shareAmount.getAmount());
      }, new Decimal(0));

      if (!totalSpecified.equals(totalAmountDecimal)) {
        throw new InvalidSplitAmountError(
          `Total split amounts (${totalSpecified}) must equal expense total (${totalAmountDecimal})`
        );
      }

      participantEntities = params.participants.map((p) => {
        const percentage = new Decimal(p.shareAmount!.getAmount())
          .dividedBy(totalAmountDecimal)
          .times(100);

        return SplitParticipant.create({
          splitId,
          userId: p.userId,
          shareAmount: p.shareAmount!,
          sharePercentage: percentage.toNumber(),
        });
      });
    } else if (params.splitType === SplitType.PERCENTAGE) {
      const totalPercentage = params.participants.reduce((sum, p) => {
        if (!p.sharePercentage) {
          throw new InvalidSplitPercentageError(0);
        }
        return sum.plus(p.sharePercentage);
      }, new Decimal(0));

      if (!totalPercentage.equals(100)) {
        throw new InvalidSplitPercentageError(totalPercentage.toNumber());
      }

      participantEntities = params.participants.map((p) => {
        const shareAmount = totalAmountDecimal
          .times(p.sharePercentage!)
          .dividedBy(100);

        return SplitParticipant.create({
          splitId,
          userId: p.userId,
          shareAmount: Money.create(
            shareAmount.toNumber(),
            params.totalAmount.getCurrency()
          ),
          sharePercentage: p.sharePercentage,
        });
      });
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

  static fromPersistence(props: ExpenseSplitProps): ExpenseSplit {
    return new ExpenseSplit(props);
  }

  get id(): SplitId { return this.props.id; }
  get expenseId(): ExpenseId { return this.props.expenseId; }
  get workspaceId(): string { return this.props.workspaceId; }
  get paidBy(): string { return this.props.paidBy; }
  get totalAmount(): Money { return this.props.totalAmount; }
  get splitType(): SplitType { return this.props.splitType; }
  get participants(): SplitParticipant[] { return this.props.participants; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  getParticipantByUserId(userId: string): SplitParticipant | undefined {
    return this.props.participants.find((p) => p.userId === userId);
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
