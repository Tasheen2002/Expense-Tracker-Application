import { TagId } from '../value-objects/tag-id';
import {
  MAX_TAG_NAME_LENGTH,
  MAX_TAG_DESCRIPTION_LENGTH,
  HEX_COLOR_REGEX,
} from '../constants/receipt.constants';
import { date, eventSnapshots, invalid, ReceiptAuditEvent, text, uuid } from './receipt-validation';
import { AggregateRoot } from '@core/domain/aggregate-root';

export interface ReceiptTagDefinitionProps {
  version?: number;
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
    if (props.version !== undefined && (!Number.isSafeInteger(props.version) || props.version < 0)) invalid('version', 'Expected a nonnegative integer');
    this.props = { ...props, workspaceId: uuid(props.workspaceId, 'workspaceId'), createdAt: date(props.createdAt, 'createdAt'),
      name: ReceiptTagDefinition.nameValue(props.name), color: ReceiptTagDefinition.colorValue(props.color),
      description: text(props.description, 'description', MAX_TAG_DESCRIPTION_LENGTH) };
  }
  private static nameValue(value: string): string {
    const name = text(value, 'name', MAX_TAG_NAME_LENGTH);
    if (!name) invalid('name', 'Tag name cannot be empty'); return name;
  }
  private static colorValue(value?: string): string | undefined {
    const color = text(value, 'color', 7);
    if (color !== undefined && !HEX_COLOR_REGEX.test(color)) invalid('color', 'Expected #RRGGBB');
    return color?.toUpperCase();
  }
  private emit(type: 'ReceiptTagCreated' | 'ReceiptTagUpdated'): void { this.addDomainEvent(new ReceiptAuditEvent(this.id.getValue(), 'ReceiptTagDefinition', type, { tagId: this.id.getValue(), workspaceId: this.workspaceId })); }
  static create(data: CreateTagData): ReceiptTagDefinition {
    const tag = new ReceiptTagDefinition({ ...data, id: TagId.create(), createdAt: new Date() }); tag.emit('ReceiptTagCreated'); return tag;
  }
  static fromPersistence(props: ReceiptTagDefinitionProps) { return new ReceiptTagDefinition({ ...props, version: props.version ?? 0 }); }
  get expectedVersion() { return this.props.version; }
  acknowledgePersistence(): void { this.props.version = this.props.version === undefined ? 0 : this.props.version + 1; }
  get domainEvents() { return eventSnapshots(super.domainEvents); }
  get id() { return this.props.id; }
  get workspaceId() { return this.props.workspaceId; }
  get name() { return this.props.name; }
  get color() { return this.props.color; }
  get description() { return this.props.description; }
  get createdAt() { return date(this.props.createdAt, 'createdAt'); }
  updateDetails(updates: { name?: string; color?: string; description?: string }): void {
    const next = new ReceiptTagDefinition({ ...this.props, ...updates, name: updates.name ?? this.name, color: updates.color === undefined ? this.color : updates.color, description: updates.description === undefined ? this.description : updates.description });
    if (next.name === this.name && next.color === this.color && next.description === this.description) return;
    this.props = next.props; this.emit('ReceiptTagUpdated');
  }
  updateName(value: string): void { const name = ReceiptTagDefinition.nameValue(value); if (name === this.props.name) return; this.props.name = name; this.emit('ReceiptTagUpdated'); }
  updateColor(value?: string): void { const color = ReceiptTagDefinition.colorValue(value); if (color === this.props.color) return; this.props.color = color; this.emit('ReceiptTagUpdated'); }
  updateDescription(value?: string): void { const description = text(value, 'description', MAX_TAG_DESCRIPTION_LENGTH); if (description === this.props.description) return; this.props.description = description; this.emit('ReceiptTagUpdated'); }
  static toDTO(tag: ReceiptTagDefinition): ReceiptTagDefinitionDTO {
    return { tagId: tag.id.getValue(), workspaceId: tag.workspaceId, name: tag.name, color: tag.color, description: tag.description, createdAt: tag.createdAt.toISOString() };
  }
}
