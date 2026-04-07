import { CategoryId } from '../value-objects/category-id';
import { AggregateRoot } from '../../../../packages/core/src/domain/aggregate-root';
import { DomainEvent } from '../../../../apps/api/src/shared/domain/events';
import {
  CategoryNameRequiredError,
  CategoryNameTooLongError,
  CategoryDescriptionTooLongError,
  InvalidHexColorError,
  IconNameTooLongError,
} from '../errors/expense.errors';

export class CategoryCreatedEvent extends DomainEvent {
  constructor(
    public readonly categoryId: string,
    public readonly workspaceId: string,
    public readonly name: string
  ) {
    super(categoryId, 'Category');
  }
  get eventType(): string { return 'category.created'; }
  getPayload(): Record<string, unknown> {
    return { categoryId: this.categoryId, workspaceId: this.workspaceId, name: this.name };
  }
}

export class CategoryUpdatedEvent extends DomainEvent {
  constructor(
    public readonly categoryId: string,
    public readonly workspaceId: string,
    public readonly field: string
  ) {
    super(categoryId, 'Category');
  }
  get eventType(): string { return 'category.updated'; }
  getPayload(): Record<string, unknown> {
    return { categoryId: this.categoryId, workspaceId: this.workspaceId, field: this.field };
  }
}

export interface CategoryProps {
  id: CategoryId;
  workspaceId: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Category extends AggregateRoot {
  private readonly props: CategoryProps;

  private constructor(props: CategoryProps) {
    super();
    this.props = props;
  }

  static create(
    props: Omit<CategoryProps, 'id' | 'createdAt' | 'updatedAt'>
  ): Category {
    this.validateName(props.name);
    this.validateDescription(props.description);
    this.validateColor(props.color);
    this.validateIcon(props.icon);

    const category = new Category({
      ...props,
      id: CategoryId.create(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    category.addDomainEvent(
      new CategoryCreatedEvent(category.id.getValue(), category.workspaceId, category.name)
    );

    return category;
  }

  static fromPersistence(props: CategoryProps): Category {
    return new Category(props);
  }

  // Validation methods
  private static validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new CategoryNameRequiredError();
    }
    if (name.length > 100) {
      throw new CategoryNameTooLongError(100);
    }
  }

  private static validateDescription(description?: string): void {
    if (description && description.length > 500) {
      throw new CategoryDescriptionTooLongError(500);
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

  private static validateIcon(icon?: string): void {
    if (icon && icon.length > 50) {
      throw new IconNameTooLongError(50);
    }
  }

  // Getters
  get id(): CategoryId {
    return this.props.id;
  }

  get workspaceId(): string {
    return this.props.workspaceId;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get color(): string | undefined {
    return this.props.color;
  }

  get icon(): string | undefined {
    return this.props.icon;
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

  // Business logic methods
  updateName(name: string): void {
    Category.validateName(name);
    this.props.name = name;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new CategoryUpdatedEvent(this.id.getValue(), this.workspaceId, 'name'));
  }

  updateDescription(description?: string): void {
    Category.validateDescription(description);
    this.props.description = description;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new CategoryUpdatedEvent(this.id.getValue(), this.workspaceId, 'description'));
  }

  updateColor(color?: string): void {
    Category.validateColor(color);
    this.props.color = color;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new CategoryUpdatedEvent(this.id.getValue(), this.workspaceId, 'color'));
  }

  updateIcon(icon?: string): void {
    Category.validateIcon(icon);
    this.props.icon = icon;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new CategoryUpdatedEvent(this.id.getValue(), this.workspaceId, 'icon'));
  }

  activate(): void {
    this.props.isActive = true;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new CategoryUpdatedEvent(this.id.getValue(), this.workspaceId, 'isActive'));
  }

  deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new CategoryUpdatedEvent(this.id.getValue(), this.workspaceId, 'isActive'));
  }

  toJSON(): CategoryDTO {
    return {
      categoryId: this.id.getValue(),
      workspaceId: this.workspaceId,
      name: this.name,
      description: this.description,
      color: this.color,
      icon: this.icon,
      isActive: this.isActive,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}

export interface CategoryDTO {
  categoryId: string;
  workspaceId: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
