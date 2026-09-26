import { TagId } from '../value-objects/tag-id';
import { AggregateRoot } from '@core/domain/aggregate-root';
import { DomainEvent } from '@core/domain/events/domain-event';
import { EXPENSE_EVENTS } from '@shared/events/expense-events';
import {
  TAG_NAME_MAX_LENGTH,
  TAG_COLOR_REGEX,
} from '../constants/expense.constants';
import {
  TagNameRequiredError,
  TagNameTooLongError,
  InvalidHexColorError,
} from '../errors/expense.errors';

export class TagCreatedEvent extends DomainEvent {
  constructor(
    public readonly tagId: string,
    public readonly workspaceId: string,
    public readonly name: string
  ) {
    super(tagId, 'Tag');
  }
  get eventType(): string { return EXPENSE_EVENTS.TAG_CREATED; }
  getPayload(): Record<string, unknown> {
    return { tagId: this.tagId, workspaceId: this.workspaceId, name: this.name };
  }
}

export class TagUpdatedEvent extends DomainEvent {
  constructor(
    public readonly tagId: string,
    public readonly workspaceId: string,
    public readonly field: string
  ) {
    super(tagId, 'Tag');
  }
  get eventType(): string { return EXPENSE_EVENTS.TAG_UPDATED; }
  getPayload(): Record<string, unknown> {
    return { tagId: this.tagId, workspaceId: this.workspaceId, field: this.field };
  }
}

export class TagDeletedEvent extends DomainEvent {
  constructor(
    public readonly tagId: string,
    public readonly workspaceId: string
  ) {
    super(tagId, 'Tag');
  }
  get eventType(): string { return EXPENSE_EVENTS.TAG_DELETED; }
  getPayload(): Record<string, unknown> {
    return { tagId: this.tagId, workspaceId: this.workspaceId };
  }
}

export interface TagDTO {
  tagId: string;
  workspaceId: string;
  name: string;
  color?: string;
  createdAt: string;
}

export interface TagProps {
  id: TagId;
  workspaceId: string;
  name: string;
  color?: string;
  createdAt: Date;
}

export class Tag extends AggregateRoot {
  private readonly props: TagProps;

  private constructor(props: TagProps) {
    super();
    this.props = props;
  }

  static create(props: Omit<TagProps, 'id' | 'createdAt'>): Tag {
    this.validateName(props.name);
    this.validateColor(props.color);

    const tag = new Tag({
      ...props,
      id: TagId.create(),
      createdAt: new Date(),
    });

    tag.addDomainEvent(
      new TagCreatedEvent(tag.id.getValue(), tag.workspaceId, tag.name)
    );

    return tag;
  }

  static fromPersistence(props: TagProps): Tag {
    return new Tag(props);
  }

  // Validation methods
  private static validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new TagNameRequiredError();
    }
    if (name.length > TAG_NAME_MAX_LENGTH) {
      throw new TagNameTooLongError(TAG_NAME_MAX_LENGTH);
    }
  }

  private static validateColor(color?: string): void {
    if (color && !TAG_COLOR_REGEX.test(color)) {
      throw new InvalidHexColorError(color);
    }
  }

  // Getters
  get id(): TagId {
    return this.props.id;
  }

  get workspaceId(): string {
    return this.props.workspaceId;
  }

  get name(): string {
    return this.props.name;
  }

  get color(): string | undefined {
    return this.props.color;
  }

  get createdAt(): Date {
    return new Date(this.props.createdAt.getTime());
  }

  // Business logic methods
  updateName(name: string): void {
    Tag.validateName(name);
    this.props.name = name;
    this.addDomainEvent(new TagUpdatedEvent(this.id.getValue(), this.workspaceId, 'name'));
  }

  updateColor(color?: string | null): void {
    if (color) {
      Tag.validateColor(color);
    }
    this.props.color = color || undefined;
    this.addDomainEvent(new TagUpdatedEvent(this.id.getValue(), this.workspaceId, 'color'));
  }

  markAsDeleted(): void {
    this.addDomainEvent(new TagDeletedEvent(this.id.getValue(), this.workspaceId));
  }

  static toDTO(tag: Tag): TagDTO {
    return {
      tagId: tag.id.getValue(),
      workspaceId: tag.workspaceId,
      name: tag.name,
      color: tag.color,
      createdAt: tag.createdAt.toISOString(),
    };
  }
}
