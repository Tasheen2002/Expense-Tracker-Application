import { ApprovalChainId, ApprovalAmount } from '../value-objects';
import { WorkspaceId, UserId, CategoryId } from '@core/domain/value-objects';
import {
  EmptyApproverSequenceError,
  MaxApproversExceededError,
  InvalidAmountRangeError,
  DuplicateApproversInSequenceError,
  InvalidApprovalChainNameError,
  ApprovalChainDescriptionTooLongError,
} from '../errors';
import {
  APPROVAL_CHAIN_NAME_MIN_LENGTH,
  APPROVAL_CHAIN_NAME_MAX_LENGTH,
  APPROVAL_CHAIN_DESCRIPTION_MAX_LENGTH,
  MIN_APPROVERS,
  MAX_APPROVERS,
} from '../constants';
import { AggregateRoot } from '@core/domain/aggregate-root';
import { DomainEvent } from '@core/domain/events/domain-event';
import { APPROVAL_POLICY_EVENTS } from '../../../../shared/events/approval-policy-events';

export class ApprovalChainCreatedEvent extends DomainEvent {
  constructor(
    public readonly chainId: string,
    public readonly workspaceId: string,
    public readonly name: string
  ) {
    super(chainId, 'ApprovalChain');
  }

  get eventType(): string {
    return APPROVAL_POLICY_EVENTS.APPROVAL_CHAIN_CREATED;
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
    return APPROVAL_POLICY_EVENTS.APPROVAL_CHAIN_UPDATED;
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
    return APPROVAL_POLICY_EVENTS.APPROVAL_CHAIN_APPROVER_SEQUENCE_CHANGED;
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
    return APPROVAL_POLICY_EVENTS.APPROVAL_CHAIN_ACTIVATED;
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
    return APPROVAL_POLICY_EVENTS.APPROVAL_CHAIN_DEACTIVATED;
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
    return APPROVAL_POLICY_EVENTS.APPROVAL_CHAIN_DELETED;
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
  minAmount?: ApprovalAmount;
  maxAmount?: ApprovalAmount;
  categoryIds?: CategoryId[];
  requiresReceipt: boolean;
  approverSequence: UserId[];
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateApprovalChainData {
  workspaceId: string;
  name: string;
  description?: string;
  minAmount?: number | ApprovalAmount;
  maxAmount?: number | ApprovalAmount;
  categoryIds?: string[];
  requiresReceipt: boolean;
  approverSequence: string[];
}

export interface ApprovalChainPersistenceData {
  chainId: ApprovalChainId;
  workspaceId: WorkspaceId;
  name: string;
  description?: string;
  minAmount?: number | ApprovalAmount | null;
  maxAmount?: number | ApprovalAmount | null;
  categoryIds?: CategoryId[];
  requiresReceipt: boolean;
  approverSequence: UserId[];
  isActive: boolean;
  version?: number;
  createdAt: Date;
  updatedAt: Date;
}

export class ApprovalChain extends AggregateRoot {
  private props: ApprovalChainProps;

  private constructor(props: ApprovalChainProps) {
    super();
    this.props = props;
  }

  static create(data: CreateApprovalChainData): ApprovalChain {
    if (!data.name || !data.name.trim()) {
      throw new InvalidApprovalChainNameError('Approval chain name cannot be empty');
    }

    const trimmedName = data.name.trim();
    if (trimmedName.length < APPROVAL_CHAIN_NAME_MIN_LENGTH) {
      throw new InvalidApprovalChainNameError('Approval chain name cannot be empty');
    }
    if (trimmedName.length > APPROVAL_CHAIN_NAME_MAX_LENGTH) {
      throw new InvalidApprovalChainNameError(
        `Approval chain name cannot exceed ${APPROVAL_CHAIN_NAME_MAX_LENGTH} characters`
      );
    }

    const trimmedDescription = data.description?.trim();
    if (
      trimmedDescription &&
      trimmedDescription.length > APPROVAL_CHAIN_DESCRIPTION_MAX_LENGTH
    ) {
      throw new ApprovalChainDescriptionTooLongError(
        APPROVAL_CHAIN_DESCRIPTION_MAX_LENGTH
      );
    }

    if (!data.approverSequence || data.approverSequence.length < MIN_APPROVERS) {
      throw new EmptyApproverSequenceError();
    }
    if (data.approverSequence.length > MAX_APPROVERS) {
      throw new MaxApproversExceededError(MAX_APPROVERS);
    }

    const normalizedSequence = data.approverSequence.map((id) =>
      UserId.fromString(id).getValue()
    );

    if (new Set(normalizedSequence).size !== normalizedSequence.length) {
      throw new DuplicateApproversInSequenceError();
    }

    const { minVo, maxVo } = ApprovalChain.validateAmountRange(
      data.minAmount,
      data.maxAmount
    );

    const chain = new ApprovalChain({
      chainId: ApprovalChainId.create(),
      workspaceId: WorkspaceId.fromString(data.workspaceId),
      name: trimmedName,
      description: trimmedDescription,
      minAmount: minVo,
      maxAmount: maxVo,
      categoryIds: data.categoryIds?.map((id) => CategoryId.fromString(id)),
      requiresReceipt: data.requiresReceipt,
      approverSequence: normalizedSequence.map((id) => UserId.fromString(id)),
      isActive: true,
      version: 1,
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

  static fromPersistence(props: ApprovalChainPersistenceData): ApprovalChain {
    const { minVo, maxVo } = ApprovalChain.validateAmountRange(
      props.minAmount ?? undefined,
      props.maxAmount ?? undefined
    );
    return new ApprovalChain({
      ...props,
      minAmount: minVo,
      maxAmount: maxVo,
      version: props.version ?? 1,
    });
  }

  get id(): ApprovalChainId {
    return this.props.chainId;
  }

  get version(): number {
    return this.props.version;
  }

  synchronizeVersion(version: number): void {
    this.props.version = version;
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
    return this.props.minAmount?.getValue();
  }

  get maxAmount(): number | undefined {
    return this.props.maxAmount?.getValue();
  }

  get minApprovalAmount(): ApprovalAmount | undefined {
    return this.props.minAmount;
  }

  get maxApprovalAmount(): ApprovalAmount | undefined {
    return this.props.maxAmount;
  }

  get categoryIds(): readonly CategoryId[] | undefined {
    return this.props.categoryIds
      ? Object.freeze([...this.props.categoryIds])
      : undefined;
  }

  get requiresReceipt(): boolean {
    return this.props.requiresReceipt;
  }

  get approverSequence(): readonly UserId[] {
    return Object.freeze([...this.props.approverSequence]);
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get createdAt(): Date {
    return new Date(this.props.createdAt.getTime());
  }

  get updatedAt(): Date {
    return new Date(this.props.updatedAt.getTime());
  }

  updateName(name: string): void {
    if (!name || !name.trim()) {
      throw new InvalidApprovalChainNameError('Approval chain name cannot be empty');
    }
    const trimmedName = name.trim();
    if (trimmedName.length < APPROVAL_CHAIN_NAME_MIN_LENGTH) {
      throw new InvalidApprovalChainNameError('Approval chain name cannot be empty');
    }
    if (trimmedName.length > APPROVAL_CHAIN_NAME_MAX_LENGTH) {
      throw new InvalidApprovalChainNameError(
        `Approval chain name cannot exceed ${APPROVAL_CHAIN_NAME_MAX_LENGTH} characters`
      );
    }

    const oldName = this.props.name;
    this.props.name = trimmedName;
    this.props.updatedAt = new Date();

    if (oldName !== trimmedName) {
      this.addDomainEvent(
        new ApprovalChainUpdatedEvent(
          this.id.getValue(),
          this.workspaceId.getValue(),
          { name: trimmedName }
        )
      );
    }
  }

  updateDescription(description?: string): void {
    const trimmedDescription = description?.trim();
    if (
      trimmedDescription &&
      trimmedDescription.length > APPROVAL_CHAIN_DESCRIPTION_MAX_LENGTH
    ) {
      throw new ApprovalChainDescriptionTooLongError(
        APPROVAL_CHAIN_DESCRIPTION_MAX_LENGTH
      );
    }

    const oldDescription = this.props.description;
    this.props.description = trimmedDescription;
    this.props.updatedAt = new Date();

    if (oldDescription !== trimmedDescription) {
      this.addDomainEvent(
        new ApprovalChainUpdatedEvent(
          this.id.getValue(),
          this.workspaceId.getValue(),
          { description: trimmedDescription }
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

  private static validateAmountRange(
    minAmount?: number | ApprovalAmount,
    maxAmount?: number | ApprovalAmount
  ): { minVo?: ApprovalAmount; maxVo?: ApprovalAmount } {
    const minVo =
      minAmount === undefined || minAmount === null
        ? undefined
        : minAmount instanceof ApprovalAmount
          ? minAmount
          : ApprovalAmount.fromNumber(minAmount);

    const maxVo =
      maxAmount === undefined || maxAmount === null
        ? undefined
        : maxAmount instanceof ApprovalAmount
          ? maxAmount
          : ApprovalAmount.fromNumber(maxAmount);

    if (minVo !== undefined && maxVo !== undefined && minVo.isGreaterThan(maxVo)) {
      throw new InvalidAmountRangeError('Min amount cannot be greater than max amount');
    }

    return { minVo, maxVo };
  }

  updateAmountRange(
    minAmount?: number | ApprovalAmount,
    maxAmount?: number | ApprovalAmount
  ): void {
    const { minVo, maxVo } = ApprovalChain.validateAmountRange(minAmount, maxAmount);
    this.props.minAmount = minVo;
    this.props.maxAmount = maxVo;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new ApprovalChainUpdatedEvent(
        this.id.getValue(),
        this.workspaceId.getValue(),
        { minAmount: minVo?.getValue(), maxAmount: maxVo?.getValue() }
      )
    );
  }

  updateApproverSequence(approverSequence: string[]): void {
    if (!approverSequence || approverSequence.length < MIN_APPROVERS) {
      throw new EmptyApproverSequenceError();
    }
    if (approverSequence.length > MAX_APPROVERS) {
      throw new MaxApproversExceededError(MAX_APPROVERS);
    }

    const normalizedSequence = approverSequence.map((id) =>
      UserId.fromString(id).getValue()
    );

    if (new Set(normalizedSequence).size !== normalizedSequence.length) {
      throw new DuplicateApproversInSequenceError();
    }

    const oldSequence = this.props.approverSequence.map((id) => id.getValue());
    this.props.approverSequence = normalizedSequence.map((id) =>
      UserId.fromString(id)
    );
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new ApproverSequenceChangedEvent(
        this.id.getValue(),
        this.workspaceId.getValue(),
        oldSequence,
        normalizedSequence
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
    amount: number | ApprovalAmount;
    categoryId?: string;
    hasReceipt: boolean;
  }): boolean {
    if (!this.props.isActive) {
      return false;
    }

    const amountVo =
      params.amount instanceof ApprovalAmount
        ? params.amount
        : ApprovalAmount.fromNumber(params.amount);

    if (this.props.minAmount !== undefined && amountVo.isLessThan(this.props.minAmount)) {
      return false;
    }

    if (this.props.maxAmount !== undefined && amountVo.isGreaterThan(this.props.maxAmount)) {
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

  equals(other: ApprovalChain): boolean {
    return this.props.chainId.equals(other.props.chainId);
  }

  toDTO(): ApprovalChainDTO {
    return ApprovalChain.toDTO(this);
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
      version: chain.version,
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
  version: number;
  createdAt: string;
  updatedAt: string;
}
