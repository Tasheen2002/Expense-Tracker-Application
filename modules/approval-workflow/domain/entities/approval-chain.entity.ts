import { ApprovalChainId } from "../value-objects/approval-chain-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { CategoryId } from "../../../expense-ledger/domain/value-objects/category-id";
import { UserId } from "../../../identity-workspace/domain/value-objects/user-id.vo";
import {
  EmptyApproverSequenceError,
  InvalidAmountRangeError,
} from "../errors/approval-workflow.errors";
import { AggregateRoot } from "../../../../apps/api/src/shared/domain/aggregate-root";
import { DomainEvent } from "../../../../apps/api/src/shared/domain/events";

export class ApprovalChainCreatedEvent extends DomainEvent {
  constructor(
    public readonly chainId: string,
    public readonly workspaceId: string,
    public readonly name: string,
  ) {
    super(chainId, "ApprovalChain");
  }

  get eventType(): string {
    return "approval-chain.created";
  }

  getPayload(): Record<string, unknown> {
    return {
      chainId: this.chainId,
      workspaceId: this.workspaceId,
      name: this.name,
    };
  }
}

export class ApprovalChainUpdatedEvent extends DomainEvent {
  constructor(
    public readonly chainId: string,
    public readonly workspaceId: string,
    public readonly changes: {
      name?: string;
      description?: string;
      minAmount?: number;
      maxAmount?: number;
    },
  ) {
    super(chainId, "ApprovalChain");
  }

  get eventType(): string {
    return "approval-chain.updated";
  }

  getPayload(): Record<string, unknown> {
    return {
      chainId: this.chainId,
      workspaceId: this.workspaceId,
      changes: this.changes,
    };
  }
}

export class ApproverSequenceChangedEvent extends DomainEvent {
  constructor(
    public readonly chainId: string,
    public readonly workspaceId: string,
    public readonly oldSequence: string[],
    public readonly newSequence: string[],
  ) {
    super(chainId, "ApprovalChain");
  }

  get eventType(): string {
    return "approval-chain.approver-sequence-changed";
  }

  getPayload(): Record<string, unknown> {
    return {
      chainId: this.chainId,
      workspaceId: this.workspaceId,
      oldSequence: this.oldSequence,
      newSequence: this.newSequence,
    };
  }
}

export class ApprovalChainActivatedEvent extends DomainEvent {
  constructor(
    public readonly chainId: string,
    public readonly workspaceId: string,
  ) {
    super(chainId, "ApprovalChain");
  }

  get eventType(): string {
    return "approval-chain.activated";
  }

  getPayload(): Record<string, unknown> {
    return {
      chainId: this.chainId,
      workspaceId: this.workspaceId,
    };
  }
}

export class ApprovalChainDeactivatedEvent extends DomainEvent {
  constructor(
    public readonly chainId: string,
    public readonly workspaceId: string,
  ) {
    super(chainId, "ApprovalChain");
  }

  get eventType(): string {
    return "approval-chain.deactivated";
  }

  getPayload(): Record<string, unknown> {
    return {
      chainId: this.chainId,
      workspaceId: this.workspaceId,
    };
  }
}

export class ApprovalChainDeletedEvent extends DomainEvent {
  constructor(
    public readonly chainId: string,
    public readonly workspaceId: string,
  ) {
    super(chainId, "ApprovalChain");
  }

  get eventType(): string {
    return "approval-chain.deleted";
  }

  getPayload(): Record<string, unknown> {
    return {
      chainId: this.chainId,
      workspaceId: this.workspaceId,
    };
  }
}

export interface ApprovalChainProps {
  chainId: ApprovalChainId;
  workspaceId: WorkspaceId;
  name: string;
  description?: string;
  minAmount?: number;
  maxAmount?: number;
  categoryIds?: CategoryId[];
  requiresReceipt: boolean;
  approverSequence: UserId[]; // Array of userId in order
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class ApprovalChain extends AggregateRoot {
  private props: ApprovalChainProps;

  private constructor(props: ApprovalChainProps) {
    super();
    this.props = props;
  }

  static create(params: {
    workspaceId: string;
    name: string;
    description?: string;
    minAmount?: number;
    maxAmount?: number;
    categoryIds?: string[];
    requiresReceipt: boolean;
    approverSequence: string[];
  }): ApprovalChain {
    if (params.approverSequence.length === 0) {
      throw new EmptyApproverSequenceError();
    }

    if (
      params.minAmount &&
      params.maxAmount &&
      params.minAmount > params.maxAmount
    ) {
      throw new InvalidAmountRangeError();
    }

    const chain = new ApprovalChain({
      chainId: ApprovalChainId.create(),
      workspaceId: WorkspaceId.fromString(params.workspaceId),
      name: params.name,
      description: params.description,
      minAmount: params.minAmount,
      maxAmount: params.maxAmount,
      categoryIds: params.categoryIds?.map((id) => CategoryId.fromString(id)),
      requiresReceipt: params.requiresReceipt,
      approverSequence: params.approverSequence.map((id) =>
        UserId.fromString(id),
      ),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    chain.addDomainEvent(
      new ApprovalChainCreatedEvent(
        chain.getId().getValue(),
        chain.getWorkspaceId().getValue(),
        chain.getName(),
      ),
    );

    return chain;
  }

  static reconstitute(props: ApprovalChainProps): ApprovalChain {
    return new ApprovalChain(props);
  }

  getId(): ApprovalChainId {
    return this.props.chainId;
  }

  getWorkspaceId(): WorkspaceId {
    return this.props.workspaceId;
  }

  getName(): string {
    return this.props.name;
  }

  getDescription(): string | undefined {
    return this.props.description;
  }

  getMinAmount(): number | undefined {
    return this.props.minAmount;
  }

  getMaxAmount(): number | undefined {
    return this.props.maxAmount;
  }

  getCategoryIds(): CategoryId[] | undefined {
    return this.props.categoryIds;
  }

  requiresReceipt(): boolean {
    return this.props.requiresReceipt;
  }

  getApproverSequence(): UserId[] {
    return this.props.approverSequence;
  }

  isActive(): boolean {
    return this.props.isActive;
  }

  getCreatedAt(): Date {
    return this.props.createdAt;
  }

  getUpdatedAt(): Date {
    return this.props.updatedAt;
  }

  updateName(name: string): void {
    const oldName = this.props.name;
    this.props.name = name;
    this.props.updatedAt = new Date();

    if (oldName !== name) {
      this.addDomainEvent(
        new ApprovalChainUpdatedEvent(
          this.getId().getValue(),
          this.getWorkspaceId().getValue(),
          { name },
        ),
      );
    }
  }

  updateDescription(description?: string): void {
    const oldDescription = this.props.description;
    this.props.description = description;
    this.props.updatedAt = new Date();

    if (oldDescription !== description) {
      this.addDomainEvent(
        new ApprovalChainUpdatedEvent(
          this.getId().getValue(),
          this.getWorkspaceId().getValue(),
          { description },
        ),
      );
    }
  }

  updateAmountRange(minAmount?: number, maxAmount?: number): void {
    if (minAmount && maxAmount && minAmount > maxAmount) {
      throw new InvalidAmountRangeError();
    }
    this.props.minAmount = minAmount;
    this.props.maxAmount = maxAmount;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new ApprovalChainUpdatedEvent(
        this.getId().getValue(),
        this.getWorkspaceId().getValue(),
        { minAmount, maxAmount },
      ),
    );
  }

  updateApproverSequence(approverSequence: string[]): void {
    if (approverSequence.length === 0) {
      throw new EmptyApproverSequenceError();
    }

    const oldSequence = this.props.approverSequence.map((id) => id.getValue());
    this.props.approverSequence = approverSequence.map((id) =>
      UserId.fromString(id),
    );
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new ApproverSequenceChangedEvent(
        this.getId().getValue(),
        this.getWorkspaceId().getValue(),
        oldSequence,
        approverSequence,
      ),
    );
  }

  activate(): void {
    if (!this.props.isActive) {
      this.props.isActive = true;
      this.props.updatedAt = new Date();

      this.addDomainEvent(
        new ApprovalChainActivatedEvent(
          this.getId().getValue(),
          this.getWorkspaceId().getValue(),
        ),
      );
    }
  }

  deactivate(): void {
    if (this.props.isActive) {
      this.props.isActive = false;
      this.props.updatedAt = new Date();

      this.addDomainEvent(
        new ApprovalChainDeactivatedEvent(
          this.getId().getValue(),
          this.getWorkspaceId().getValue(),
        ),
      );
    }
  }

  markAsDeleted(): void {
    this.addDomainEvent(
      new ApprovalChainDeletedEvent(
        this.getId().getValue(),
        this.getWorkspaceId().getValue(),
      ),
    );
  }

  appliesTo(params: {
    amount: number;
    categoryId?: string;
    hasReceipt: boolean;
  }): boolean {
    if (!this.props.isActive) {
      return false;
    }

    if (this.props.minAmount && params.amount < this.props.minAmount) {
      return false;
    }

    if (this.props.maxAmount && params.amount > this.props.maxAmount) {
      return false;
    }

    if (this.props.categoryIds && this.props.categoryIds.length > 0) {
      if (!params.categoryId) {
        return false;
      }
      const categoryIdSet = new Set(
        this.props.categoryIds.map((id) => id.getValue()),
      );
      if (!categoryIdSet.has(params.categoryId)) {
        return false;
      }
    }

    if (this.props.requiresReceipt && !params.hasReceipt) {
      return false;
    }

    return true;
  }
}
