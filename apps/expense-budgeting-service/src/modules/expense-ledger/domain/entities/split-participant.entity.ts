import { SplitParticipantId } from '../value-objects/split-participant-id';
import { SplitId } from '../value-objects/split-id';
import { Money } from '../value-objects/money';

export interface SplitParticipantProps {
  id: SplitParticipantId;
  splitId: SplitId;
  userId: string;
  shareAmount: Money;
  sharePercentage?: number;
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
    sharePercentage?: number;
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

  static fromPersistence(props: SplitParticipantProps): SplitParticipant {
    return new SplitParticipant(props);
  }

  get id(): SplitParticipantId {
    return this.props.id;
  }
  get splitId(): SplitId {
    return this.props.splitId;
  }
  get userId(): string {
    return this.props.userId;
  }
  get shareAmount(): Money {
    return this.props.shareAmount;
  }
  get sharePercentage(): number | undefined {
    return this.props.sharePercentage;
  }
  get isPaid(): boolean {
    return this.props.isPaid;
  }
  get paidAt(): Date | undefined {
    return this.props.paidAt;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
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

  updateSharePercentage(percentage: number): void {
    this.props.sharePercentage = percentage;
    this.props.updatedAt = new Date();
  }
}
