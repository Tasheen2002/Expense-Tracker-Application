import { CategoryId } from '../value-objects/category-id';
import { AggregateRoot } from '@core/domain/aggregate-root';
import { DomainEvent } from '@core/domain/events/domain-event';
import { EXPENSE_EVENTS } from '@shared/events/expense-events';
import {
  CATEGORY_NAME_MAX_LENGTH,
  CATEGORY_DESCRIPTION_MAX_LENGTH,
  CATEGORY_ICON_MAX_LENGTH,
  CATEGORY_COLOR_REGEX,
} from '../constants/expense.constants';
import {
  CategoryNameRequiredError,
  CategoryNameTooLongError,
  CategoryDescriptionTooLongError,
  InvalidHexColorError,
  IconNameTooLongError,
} from '../errors/expense.errors';

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

export class CategoryCreatedEvent extends DomainEvent {
  constructor(
    public readonly categoryId: string,
    public readonly workspaceId: string,
    public readonly name: string
  ) {
    super(categoryId, 'Category');
  }
  get eventType(): string { return EXPENSE_EVENTS.CATEGORY_CREATED; }
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
  get eventType(): string { return EXPENSE_EVENTS.CATEGORY_UPDATED; }
  getPayload(): Record<string, unknown> {
    return { categoryId: this.categoryId, workspaceId: this.workspaceId, field: this.field };
  }
}

export class CategoryDeletedEvent extends DomainEvent {
  constructor(
    public readonly categoryId: string,
    public readonly workspaceId: string
  ) {
    super(categoryId, 'Category');
  }
  get eventType(): string { return EXPENSE_EVENTS.CATEGORY_DELETED; }
  getPayload(): Record<string, unknown> {
    return { categoryId: this.categoryId, workspaceId: this.workspaceId };
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
    if (name.length > CATEGORY_NAME_MAX_LENGTH) {
      throw new CategoryNameTooLongError(CATEGORY_NAME_MAX_LENGTH);
    }
  }

  private static validateDescription(description?: string): void {
    if (description && description.length > CATEGORY_DESCRIPTION_MAX_LENGTH) {
      throw new CategoryDescriptionTooLongError(CATEGORY_DESCRIPTION_MAX_LENGTH);
    }
  }

  private static validateColor(color?: string): void {
    if (color && !CATEGORY_COLOR_REGEX.test(color)) {
      throw new InvalidHexColorError(color);
    }
  }

  private static validateIcon(icon?: string): void {
    if (icon && icon.length > CATEGORY_ICON_MAX_LENGTH) {
      throw new IconNameTooLongError(CATEGORY_ICON_MAX_LENGTH);
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
    return new Date(this.props.createdAt.getTime());
  }

  get updatedAt(): Date {
    return new Date(this.props.updatedAt.getTime());
  }

  // Business logic methods
  updateName(name: string): void {
    Category.validateName(name);
    this.props.name = name;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new CategoryUpdatedEvent(this.id.getValue(), this.workspaceId, 'name'));
  }

  updateDescription(description?: string | null): void {
    if (description) {
      Category.validateDescription(description);
    }
    this.props.description = description || undefined;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new CategoryUpdatedEvent(this.id.getValue(), this.workspaceId, 'description'));
  }

  updateColor(color?: string | null): void {
    if (color) {
      Category.validateColor(color);
    }
    this.props.color = color || undefined;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new CategoryUpdatedEvent(this.id.getValue(), this.workspaceId, 'color'));
  }

  updateIcon(icon?: string | null): void {
    if (icon) {
      Category.validateIcon(icon);
    }
    this.props.icon = icon || undefined;
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

  markAsDeleted(): void {
    this.addDomainEvent(new CategoryDeletedEvent(this.id.getValue(), this.workspaceId));
  }

  static toDTO(category: Category): CategoryDTO {
    return {
      categoryId: category.id.getValue(),
      workspaceId: category.workspaceId,
      name: category.name,
      description: category.description,
      color: category.color,
      icon: category.icon,
      isActive: category.isActive,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    };
  }
}
