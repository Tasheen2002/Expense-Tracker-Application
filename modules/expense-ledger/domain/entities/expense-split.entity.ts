import { SplitId } from "../value-objects/split-id";
import { ExpenseId } from "../value-objects/expense-id";
import { Money } from "../value-objects/money";
import { SplitType } from "../enums/split-type";
import { SplitParticipant } from "./split-participant.entity";
import {
  InvalidSplitAmountError,
  InvalidSplitPercentageError,
  InsufficientParticipantsError,
} from "../errors/split-expense.errors";
import { Decimal } from "@prisma/client/runtime/library";

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

export class ExpenseSplit {
  private constructor(private props: ExpenseSplitProps) {}

  static create(params: {
    expenseId: ExpenseId;
    workspaceId: string;
    paidBy: string;
    totalAmount: Money;
    splitType: SplitType;
    participants: Array<{
      userId: string;
      shareAmount?: Money;
      sharePercentage?: Decimal;
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
        params.participants.length,
      );

      participantEntities = params.participants.map((p) =>
        SplitParticipant.create({
          splitId,
          userId: p.userId,
          shareAmount: Money.create(
            shareAmount.toNumber(),
            params.totalAmount.getCurrency(),
          ),
          sharePercentage: new Decimal(100).dividedBy(
            params.participants.length,
          ),
        }),
      );
    } else if (params.splitType === SplitType.EXACT) {
      const totalSpecified = params.participants.reduce((sum, p) => {
        if (!p.shareAmount) {
          throw new InvalidSplitAmountError(
            "Share amount required for EXACT split type",
          );
        }
        return sum.plus(p.shareAmount.getAmount());
      }, new Decimal(0));

      if (!totalSpecified.equals(totalAmountDecimal)) {
        throw new InvalidSplitAmountError(
          `Total split amounts (${totalSpecified}) must equal expense total (${totalAmountDecimal})`,
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
          sharePercentage: percentage,
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
            params.totalAmount.getCurrency(),
          ),
          sharePercentage: p.sharePercentage,
        });
      });
    }

    return new ExpenseSplit({
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
  }

  static reconstitute(props: ExpenseSplitProps): ExpenseSplit {
    return new ExpenseSplit(props);
  }

  getId(): SplitId {
    return this.props.id;
  }

  getExpenseId(): ExpenseId {
    return this.props.expenseId;
  }

  getWorkspaceId(): string {
    return this.props.workspaceId;
  }

  getPaidBy(): string {
    return this.props.paidBy;
  }

  getTotalAmount(): Money {
    return this.props.totalAmount;
  }

  getSplitType(): SplitType {
    return this.props.splitType;
  }

  getParticipants(): SplitParticipant[] {
    return this.props.participants;
  }

  getCreatedAt(): Date {
    return this.props.createdAt;
  }

  getUpdatedAt(): Date {
    return this.props.updatedAt;
  }

  getParticipantByUserId(userId: string): SplitParticipant | undefined {
    return this.props.participants.find((p) => p.getUserId() === userId);
  }

  isParticipant(userId: string): boolean {
    return this.props.participants.some((p) => p.getUserId() === userId);
  }

  isFullySettled(): boolean {
    return this.props.participants
      .filter((p) => p.getUserId() !== this.props.paidBy)
      .every((p) => p.isPaidStatus());
  }

  getOutstandingAmount(): Money {
    const outstanding = this.props.participants
      .filter((p) => p.getUserId() !== this.props.paidBy && !p.isPaidStatus())
      .reduce(
        (sum, p) => sum.plus(p.getShareAmount().getAmount()),
        new Decimal(0),
      );

    return Money.create(
      outstanding.toNumber(),
      this.props.totalAmount.getCurrency(),
    );
  }
}
