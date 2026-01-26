import { TagId } from '../value-objects/tag-id'

export interface TagProps {
  id: TagId
  workspaceId: string
  name: string
  color?: string
  createdAt: Date
}

export class Tag {
  private readonly props: TagProps

  private constructor(props: TagProps) {
    this.props = props
  }

  static create(props: Omit<TagProps, 'id' | 'createdAt'>): Tag {
    this.validateName(props.name)
    this.validateColor(props.color)

    return new Tag({
      ...props,
      id: TagId.create(),
      createdAt: new Date(),
    })
  }

  static fromPersistence(props: TagProps): Tag {
    return new Tag(props)
  }

  // Validation methods
  private static validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Tag name is required')
    }
    if (name.length > 50) {
      throw new Error('Tag name cannot exceed 50 characters')
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

  // Getters
  get id(): TagId {
    return this.props.id
  }

  get workspaceId(): string {
    return this.props.workspaceId
  }

  get name(): string {
    return this.props.name
  }

  get color(): string | undefined {
    return this.props.color
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  // Business logic methods
  updateName(name: string): void {
    Tag.validateName(name)
    this.props.name = name
  }

  updateColor(color?: string): void {
    Tag.validateColor(color)
    this.props.color = color
  }
}
