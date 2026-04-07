import { TagId } from '../value-objects/tag-id';
import { AggregateRoot } from '../../../../packages/core/src/domain/aggregate-root';
import { DomainEvent } from '../../../../apps/api/src/shared/domain/events';
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
  get eventType(): string { return 'tag.created'; }
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
  get eventType(): string { return 'tag.updated'; }
  getPayload(): Record<string, unknown> {
    return { tagId: this.tagId, workspaceId: this.workspaceId, field: this.field };
  }
}

export class TagDeletedEvent extends DomainEvent {
  constructor(public readonly tagId: string) {
    super(tagId, 'Tag');
  }
  get eventType(): string { return 'tag.deleted'; }
  getPayload(): Record<string, unknown> {
    return { tagId: this.tagId };
  }
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
    if (name.length > 50) {
      throw new TagNameTooLongError(50);
    }
  }

  private static validateColor(color?: string): void {
    if (color) {
      const hexColorRegex = /^#[0-9A-F]{6}$/i;
      if (!hexColorRegex.test(color)) {
        throw new InvalidHexColorError(color);
      }
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
    return this.props.createdAt;
  }

  // Business logic methods
  updateName(name: string): void {
    Tag.validateName(name);
    this.props.name = name;
    this.addDomainEvent(new TagUpdatedEvent(this.id.getValue(), this.workspaceId, 'name'));
  }

  updateColor(color?: string): void {
    Tag.validateColor(color);
    this.props.color = color;
    this.addDomainEvent(new TagUpdatedEvent(this.id.getValue(), this.workspaceId, 'color'));
  }

  markAsDeleted(): void {
    this.addDomainEvent(new TagDeletedEvent(this.id.getValue()));
  }

  toJSON(): TagDTO {
    return {
      tagId: this.id.getValue(),
      workspaceId: this.workspaceId,
      name: this.name,
      color: this.color,
      createdAt: this.createdAt.toISOString(),
    };
  }
}

export interface TagDTO {
  tagId: string;
  workspaceId: string;
  name: string;
  color?: string;
  createdAt: string;
}
