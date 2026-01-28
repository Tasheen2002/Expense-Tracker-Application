import { SplitParticipantId } from "../value-objects/split-participant-id";
import { SplitId } from "../value-objects/split-id";
import { Money } from "../value-objects/money";
import { Decimal } from "@prisma/client/runtime/library";

export interface SplitParticipantProps {
  id: SplitParticipantId;
  splitId: SplitId;
  userId: string;
  shareAmount: Money;
  sharePercentage?: Decimal;
  isPaid: boolean;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class SplitParticipant {
  private constructor(private props: SplitParticipantProps) {}

  static create(params: {
    splitId: SplitId;
    userId: string;
    shareAmount: Money;
    sharePercentage?: Decimal;
  }): SplitParticipant {
    return new SplitParticipant({
      id: SplitParticipantId.create(),
      splitId: params.splitId,
      userId: params.userId,
      shareAmount: params.shareAmount,
      sharePercentage: params.sharePercentage,
      isPaid: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: SplitParticipantProps): SplitParticipant {
    return new SplitParticipant(props);
  }

  getId(): SplitParticipantId {
    return this.props.id;
  }

  getSplitId(): SplitId {
    return this.props.splitId;
  }

  getUserId(): string {
    return this.props.userId;
  }

  getShareAmount(): Money {
    return this.props.shareAmount;
  }

  getSharePercentage(): Decimal | undefined {
    return this.props.sharePercentage;
  }

  isPaidStatus(): boolean {
    return this.props.isPaid;
  }

  getPaidAt(): Date | undefined {
    return this.props.paidAt;
  }

  getCreatedAt(): Date {
    return this.props.createdAt;
  }

  getUpdatedAt(): Date {
    return this.props.updatedAt;
  }

  markAsPaid(): void {
    this.props.isPaid = true;
    this.props.paidAt = new Date();
    this.props.updatedAt = new Date();
  }

  markAsUnpaid(): void {
    this.props.isPaid = false;
    this.props.paidAt = undefined;
    this.props.updatedAt = new Date();
  }

  updateShareAmount(amount: Money): void {
    this.props.shareAmount = amount;
    this.props.updatedAt = new Date();
  }

  updateSharePercentage(percentage: Decimal): void {
    this.props.sharePercentage = percentage;
    this.props.updatedAt = new Date();
  }
}
