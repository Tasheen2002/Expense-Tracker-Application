import { TagId } from '../value-objects/tag-id';
import {
  MAX_TAG_NAME_LENGTH,
  MIN_TAG_NAME_LENGTH,
  MAX_TAG_DESCRIPTION_LENGTH,
  HEX_COLOR_REGEX,
} from '../constants/receipt.constants';
import { ReceiptValidationError } from '../errors/receipt.errors';
import { AggregateRoot } from '@core/domain/aggregate-root';

export interface ReceiptTagDefinitionProps {
  id: TagId;
  workspaceId: string;
  name: string;
  color?: string;
  description?: string;
  createdAt: Date;
}

export interface ReceiptTagDefinitionDTO {
  tagId: string;
  workspaceId: string;
  name: string;
  color?: string;
  description?: string;
  createdAt: string;
}

export interface CreateTagData {
  workspaceId: string;
  name: string;
  color?: string;
  description?: string;
}

export class ReceiptTagDefinition extends AggregateRoot {
  private constructor(private props: ReceiptTagDefinitionProps) {
    super();
  }

  static create(data: CreateTagData): ReceiptTagDefinition {
    if (!data.name || data.name.trim().length === 0) {
      throw new ReceiptValidationError('name', 'Tag name cannot be empty');
    }

    if (data.name.length < MIN_TAG_NAME_LENGTH) {
      throw new ReceiptValidationError(
        'name',
        `Tag name must be at least ${MIN_TAG_NAME_LENGTH} character`
      );
    }

    if (data.name.length > MAX_TAG_NAME_LENGTH) {
      throw new ReceiptValidationError(
        'name',
        `Tag name cannot exceed ${MAX_TAG_NAME_LENGTH} characters`
      );
    }

    if (data.color && !this.isValidHexColor(data.color)) {
      throw new ReceiptValidationError(
        'color',
        'Invalid hex color format. Expected format: #RRGGBB'
      );
    }

    if (
      data.description &&
      data.description.length > MAX_TAG_DESCRIPTION_LENGTH
    ) {
      throw new ReceiptValidationError(
        'description',
        `Tag description cannot exceed ${MAX_TAG_DESCRIPTION_LENGTH} characters`
      );
    }

    return new ReceiptTagDefinition({
      id: TagId.create(),
      workspaceId: data.workspaceId,
      name: data.name.trim(),
      color: data.color,
      description: data.description,
      createdAt: new Date(),
    });
  }

  static fromPersistence(
    props: ReceiptTagDefinitionProps
  ): ReceiptTagDefinition {
    return new ReceiptTagDefinition(props);
  }

  private static isValidHexColor(color: string): boolean {
    return HEX_COLOR_REGEX.test(color);
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

  get description(): string | undefined {
    return this.props.description;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  // Business logic methods
  updateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new ReceiptValidationError('name', 'Tag name cannot be empty');
    }

    if (name.length > MAX_TAG_NAME_LENGTH) {
      throw new ReceiptValidationError(
        'name',
        `Tag name cannot exceed ${MAX_TAG_NAME_LENGTH} characters`
      );
    }

    this.props.name = name.trim();
  }

  updateColor(color: string | undefined): void {
    if (color && !ReceiptTagDefinition.isValidHexColor(color)) {
      throw new ReceiptValidationError(
        'color',
        'Invalid hex color format. Expected format: #RRGGBB'
      );
    }

    this.props.color = color;
  }

  updateDescription(description: string | undefined): void {
    if (description && description.length > MAX_TAG_DESCRIPTION_LENGTH) {
      throw new ReceiptValidationError(
        'description',
        `Tag description cannot exceed ${MAX_TAG_DESCRIPTION_LENGTH} characters`
      );
    }

    this.props.description = description;
  }

  static toDTO(tag: ReceiptTagDefinition): ReceiptTagDefinitionDTO {
    return {
      tagId: tag.id.getValue(),
      workspaceId: tag.workspaceId,
      name: tag.name,
      color: tag.color,
      description: tag.description,
      createdAt: tag.createdAt.toISOString(),
    };
  }
}
