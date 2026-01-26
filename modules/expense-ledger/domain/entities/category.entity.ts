import { CategoryId } from '../value-objects/category-id'

export interface CategoryProps {
  id: CategoryId
  workspaceId: string
  name: string
  description?: string
  color?: string
  icon?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export class Category {
  private readonly props: CategoryProps

  private constructor(props: CategoryProps) {
    this.props = props
  }

  static create(props: Omit<CategoryProps, 'id' | 'createdAt' | 'updatedAt'>): Category {
    this.validateName(props.name)
    this.validateDescription(props.description)
    this.validateColor(props.color)
    this.validateIcon(props.icon)

    return new Category({
      ...props,
      id: CategoryId.create(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  static fromPersistence(props: CategoryProps): Category {
    return new Category(props)
  }

  // Validation methods
  private static validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Category name is required')
    }
    if (name.length > 100) {
      throw new Error('Category name cannot exceed 100 characters')
    }
  }

  private static validateDescription(description?: string): void {
    if (description && description.length > 500) {
      throw new Error('Category description cannot exceed 500 characters')
    }
  }

  private static validateColor(color?: string): void {
    if (color) {
      const hexColorRegex = /^#[0-9A-F]{6}$/i
      if (!hexColorRegex.test(color)) {
        throw new Error('Color must be a valid hex color code (e.g., #FFFFFF)')
      }
    }
  }

  private static validateIcon(icon?: string): void {
    if (icon && icon.length > 50) {
      throw new Error('Icon name cannot exceed 50 characters')
    }
  }

  // Getters
  get id(): CategoryId {
    return this.props.id
  }

  get workspaceId(): string {
    return this.props.workspaceId
  }

  get name(): string {
    return this.props.name
  }

  get description(): string | undefined {
    return this.props.description
  }

  get color(): string | undefined {
    return this.props.color
  }

  get icon(): string | undefined {
    return this.props.icon
  }

  get isActive(): boolean {
    return this.props.isActive
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date {
    return this.props.updatedAt
  }

  // Business logic methods
  updateName(name: string): void {
    Category.validateName(name)
    this.props.name = name
    this.props.updatedAt = new Date()
  }

  updateDescription(description?: string): void {
    Category.validateDescription(description)
    this.props.description = description
    this.props.updatedAt = new Date()
  }

  updateColor(color?: string): void {
    Category.validateColor(color)
    this.props.color = color
    this.props.updatedAt = new Date()
  }

  updateIcon(icon?: string): void {
    Category.validateIcon(icon)
    this.props.icon = icon
    this.props.updatedAt = new Date()
  }

  activate(): void {
    this.props.isActive = true
    this.props.updatedAt = new Date()
  }

  deactivate(): void {
    this.props.isActive = false
    this.props.updatedAt = new Date()
  }
}
