import { ApprovalChainId } from '../value-objects/approval-chain-id';
import {  WorkspaceId, UserId  } from '@core/domain/value-objects';
import {  CategoryId  } from '@core/domain/value-objects';
import {
  EmptyApproverSequenceError,
  InvalidAmountRangeError,
} from '../errors/approval-workflow.errors';
import { AggregateRoot } from '@core/domain/aggregate-root';
import { DomainEvent } from '@core/domain/events/domain-event';

export class ApprovalChainCreatedEvent extends DomainEvent {
  constructor(
    public readonly chainId: string,
    public readonly workspaceId: string,
    public readonly name: string
  ) {
    super(chainId, 'ApprovalChain');
  }

  get eventType(): string {
    return 'approval-chain.created';
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
      categoryIds?: string[];
      requiresReceipt?: boolean;
    }
  ) {
    super(chainId, 'ApprovalChain');
  }

  get eventType(): string {
    return 'approval-chain.updated';
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
    public readonly newSequence: string[]
  ) {
    super(chainId, 'ApprovalChain');
  }

  get eventType(): string {
    return 'approval-chain.approver-sequence-changed';
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
    public readonly workspaceId: string
  ) {
    super(chainId, 'ApprovalChain');
  }

  get eventType(): string {
    return 'approval-chain.activated';
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
    public readonly workspaceId: string
  ) {
    super(chainId, 'ApprovalChain');
  }

  get eventType(): string {
    return 'approval-chain.deactivated';
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
    public readonly workspaceId: string
  ) {
    super(chainId, 'ApprovalChain');
  }

  get eventType(): string {
    return 'approval-chain.deleted';
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
  approverSequence: UserId[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateApprovalChainData {
  workspaceId: string;
  name: string;
  description?: string;
  minAmount?: number;
  maxAmount?: number;
  categoryIds?: string[];
  requiresReceipt: boolean;
  approverSequence: string[];
}

export class ApprovalChain extends AggregateRoot {
  private props: ApprovalChainProps;

  private constructor(props: ApprovalChainProps) {
    super();
    this.props = props;
  }

  static create(data: CreateApprovalChainData): ApprovalChain {
    if (data.approverSequence.length === 0) {
      throw new EmptyApproverSequenceError();
    }

    if (
      data.minAmount &&
      data.maxAmount &&
      data.minAmount > data.maxAmount
    ) {
      throw new InvalidAmountRangeError();
    }

    const chain = new ApprovalChain({
      chainId: ApprovalChainId.create(),
      workspaceId: WorkspaceId.fromString(data.workspaceId),
      name: data.name,
      description: data.description,
      minAmount: data.minAmount,
      maxAmount: data.maxAmount,
      categoryIds: data.categoryIds?.map((id) => CategoryId.fromString(id)),
      requiresReceipt: data.requiresReceipt,
      approverSequence: data.approverSequence.map((id) =>
        UserId.fromString(id)
      ),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    chain.addDomainEvent(
      new ApprovalChainCreatedEvent(
        chain.id.getValue(),
        chain.workspaceId.getValue(),
        chain.name
      )
    );

    return chain;
  }

  static fromPersistence(props: ApprovalChainProps): ApprovalChain {
    return new ApprovalChain(props);
  }

  get id(): ApprovalChainId {
    return this.props.chainId;
  }

  get workspaceId(): WorkspaceId {
    return this.props.workspaceId;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get minAmount(): number | undefined {
    return this.props.minAmount;
  }

  get maxAmount(): number | undefined {
    return this.props.maxAmount;
  }

  get categoryIds(): CategoryId[] | undefined {
    return this.props.categoryIds;
  }

  get requiresReceipt(): boolean {
    return this.props.requiresReceipt;
  }

  get approverSequence(): UserId[] {
    return this.props.approverSequence;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  updateName(name: string): void {
    const oldName = this.props.name;
    this.props.name = name;
    this.props.updatedAt = new Date();

    if (oldName !== name) {
      this.addDomainEvent(
        new ApprovalChainUpdatedEvent(
          this.id.getValue(),
          this.workspaceId.getValue(),
          { name }
        )
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
          this.id.getValue(),
          this.workspaceId.getValue(),
          { description }
        )
      );
    }
  }

  updateCategoryIds(categoryIds?: string[]): void {
    this.props.categoryIds = categoryIds?.map((id) =>
      CategoryId.fromString(id)
    );
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new ApprovalChainUpdatedEvent(
        this.id.getValue(),
        this.workspaceId.getValue(),
        { categoryIds }
      )
    );
  }

  updateRequiresReceipt(requiresReceipt: boolean): void {
    const oldRequiresReceipt = this.props.requiresReceipt;
    this.props.requiresReceipt = requiresReceipt;
    this.props.updatedAt = new Date();

    if (oldRequiresReceipt !== requiresReceipt) {
      this.addDomainEvent(
        new ApprovalChainUpdatedEvent(
          this.id.getValue(),
          this.workspaceId.getValue(),
          { requiresReceipt }
        )
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
        this.id.getValue(),
        this.workspaceId.getValue(),
        { minAmount, maxAmount }
      )
    );
  }

  updateApproverSequence(approverSequence: string[]): void {
    if (approverSequence.length === 0) {
      throw new EmptyApproverSequenceError();
    }

    const oldSequence = this.props.approverSequence.map((id) => id.getValue());
    this.props.approverSequence = approverSequence.map((id) =>
      UserId.fromString(id)
    );
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new ApproverSequenceChangedEvent(
        this.id.getValue(),
        this.workspaceId.getValue(),
        oldSequence,
        approverSequence
      )
    );
  }

  activate(): void {
    if (!this.props.isActive) {
      this.props.isActive = true;
      this.props.updatedAt = new Date();

      this.addDomainEvent(
        new ApprovalChainActivatedEvent(
          this.id.getValue(),
          this.workspaceId.getValue()
        )
      );
    }
  }

  deactivate(): void {
    if (this.props.isActive) {
      this.props.isActive = false;
      this.props.updatedAt = new Date();

      this.addDomainEvent(
        new ApprovalChainDeactivatedEvent(
          this.id.getValue(),
          this.workspaceId.getValue()
        )
      );
    }
  }

  markAsDeleted(): void {
    this.addDomainEvent(
      new ApprovalChainDeletedEvent(
        this.id.getValue(),
        this.workspaceId.getValue()
      )
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
        this.props.categoryIds.map((id) => id.getValue())
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

  static toDTO(chain: ApprovalChain): ApprovalChainDTO {
    return {
      chainId: chain.id.getValue(),
      workspaceId: chain.workspaceId.getValue(),
      name: chain.name,
      description: chain.description,
      minAmount: chain.minAmount,
      maxAmount: chain.maxAmount,
      categoryIds: chain.categoryIds?.map((id) => id.getValue()),
      requiresReceipt: chain.requiresReceipt,
      approverSequence: chain.approverSequence.map((id) => id.getValue()),
      isActive: chain.isActive,
      createdAt: chain.createdAt.toISOString(),
      updatedAt: chain.updatedAt.toISOString(),
    };
  }
}

export interface ApprovalChainDTO {
  chainId: string;
  workspaceId: string;
  name: string;
  description?: string;
  minAmount?: number;
  maxAmount?: number;
  categoryIds?: string[];
  requiresReceipt: boolean;
  approverSequence: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
