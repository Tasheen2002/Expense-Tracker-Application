import { MetadataId } from '../value-objects/metadata-id';
import { ReceiptId } from '../value-objects/receipt-id';
import Decimal from 'decimal.js';
import { amount, currency, date, eventSnapshots, invalid, jsonFields, JsonValue, ReceiptAuditEvent, text } from './receipt-validation';
import { AggregateRoot } from '@core/domain/aggregate-root';

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface ReceiptMetadataProps {
  version?: number;
  id: MetadataId;
  receiptId: ReceiptId;
  merchantName?: string;
  merchantAddress?: string;
  merchantPhone?: string;
  merchantTaxId?: string;
  transactionDate?: Date;
  transactionTime?: string;
  subtotal?: Decimal;
  taxAmount?: Decimal;
  tipAmount?: Decimal;
  totalAmount?: Decimal;
  currency?: string;
  paymentMethod?: string;
  lastFourDigits?: string;
  invoiceNumber?: string;
  poNumber?: string;
  lineItems?: LineItem[];
  notes?: string;
  customFields?: Record<string, JsonValue>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReceiptMetadataDTO {
  metadataId: string;
  receiptId: string;
  merchantName?: string;
  merchantAddress?: string;
  merchantPhone?: string;
  merchantTaxId?: string;
  transactionDate?: string;
  transactionTime?: string;
  subtotal?: string;
  taxAmount?: string;
  tipAmount?: string;
  totalAmount?: string;
  currency?: string;
  paymentMethod?: string;
  lastFourDigits?: string;
  invoiceNumber?: string;
  poNumber?: string;
  lineItems?: LineItem[];
  notes?: string;
  customFields?: Record<string, JsonValue>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMetadataData {
  receiptId: string;
  merchantName?: string;
  merchantAddress?: string;
  merchantPhone?: string;
  merchantTaxId?: string;
  transactionDate?: Date;
  transactionTime?: string;
  subtotal?: number | string;
  taxAmount?: number | string;
  tipAmount?: number | string;
  totalAmount?: number | string;
  currency?: string;
  paymentMethod?: string;
  lastFourDigits?: string;
  invoiceNumber?: string;
  poNumber?: string;
  lineItems?: LineItem[];
  notes?: string;
  customFields?: Record<string, JsonValue>;
}

export class ReceiptMetadata extends AggregateRoot {
  private constructor(private props: ReceiptMetadataProps) { super(); this.props = ReceiptMetadata.validated(props); }
  private static validated(props: ReceiptMetadataProps): ReceiptMetadataProps {
    if (props.version !== undefined && (!Number.isSafeInteger(props.version) || props.version < 0)) invalid('version', 'Expected a nonnegative integer');
    const result = { ...props, createdAt: date(props.createdAt, 'createdAt'), updatedAt: date(props.updatedAt, 'updatedAt') };
    const limits = { merchantName: 255, merchantAddress: 500, merchantPhone: 50, merchantTaxId: 50, transactionTime: 20, paymentMethod: 50, lastFourDigits: 4, invoiceNumber: 100, poNumber: 100, notes: 5000 } as const;
    for (const field of Object.keys(limits) as (keyof typeof limits)[]) result[field] = text(props[field], field, limits[field]);
    result.currency = currency(props.currency);
    if (result.lastFourDigits !== undefined && !/^\d{4}$/.test(result.lastFourDigits)) invalid('lastFourDigits', 'Expected four digits');
    if (result.transactionTime !== undefined && !/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(result.transactionTime)) invalid('transactionTime', 'Expected HH:mm or HH:mm:ss');
    if (props.transactionDate !== undefined) {
      const value = date(props.transactionDate, 'transactionDate');
      value.setUTCHours(0, 0, 0, 0);
      result.transactionDate = value;
    }
    for (const field of ['subtotal', 'taxAmount', 'tipAmount', 'totalAmount'] as const) result[field] = amount(props[field], field);
    if (props.lineItems !== undefined) {
      if (!Array.isArray(props.lineItems) || props.lineItems.length > 500) invalid('lineItems', 'Expected at most 500 items');
      result.lineItems = props.lineItems.map(item => {
        const description = text(item.description, 'description', 500);
        if (!description || !Number.isFinite(item.quantity) || item.quantity <= 0 || new Decimal(item.quantity).decimalPlaces() > 3) invalid('lineItems', 'Expected description and positive quantity with at most three decimals');
        const unitPrice = amount(item.unitPrice, 'unitPrice'), lineAmount = amount(item.amount, 'amount');
        if (unitPrice === undefined || lineAmount === undefined) invalid('lineItems', 'Price and amount are required');
        return { description, quantity: item.quantity, unitPrice: unitPrice.toNumber(), amount: lineAmount.toNumber() };
      });
    }
    if (props.customFields !== undefined) result.customFields = jsonFields(props.customFields);
    return result;
  }
  static create(data: CreateMetadataData): ReceiptMetadata {
    const now = new Date();
    const metadata = new ReceiptMetadata({
      ...data, id: MetadataId.create(), receiptId: ReceiptId.fromString(data.receiptId),
      subtotal: amount(data.subtotal, 'subtotal'), taxAmount: amount(data.taxAmount, 'taxAmount'),
      tipAmount: amount(data.tipAmount, 'tipAmount'), totalAmount: amount(data.totalAmount, 'totalAmount'),
      createdAt: now, updatedAt: now,
    });
    metadata.emit('ReceiptMetadataCreated');
    return metadata;
  }
  static fromPersistence(props: ReceiptMetadataProps): ReceiptMetadata { return new ReceiptMetadata({ ...props, version: props.version ?? 0 }); }
  get expectedVersion() { return this.props.version; }
  acknowledgePersistence(): void { this.props.version = this.props.version === undefined ? 0 : this.props.version + 1; }
  get domainEvents() { return eventSnapshots(super.domainEvents); }
  private emit(type: 'ReceiptMetadataCreated' | 'ReceiptMetadataUpdated'): void {
    this.addDomainEvent(new ReceiptAuditEvent(this.id.getValue(), 'ReceiptMetadata', type, { metadataId: this.id.getValue(), receiptId: this.receiptId.getValue() }));
  }
  private apply(changes: Partial<ReceiptMetadataProps>): void {
    const candidate = ReceiptMetadata.validated({ ...this.props, ...changes });
    if (JSON.stringify(candidate) === JSON.stringify(this.props)) return;
    candidate.updatedAt = new Date();
    this.props = candidate;
    this.emit('ReceiptMetadataUpdated');
  }
  get id() { return this.props.id; }
  get receiptId() { return this.props.receiptId; }
  get merchantName() { return this.props.merchantName; }
  get merchantAddress() { return this.props.merchantAddress; }
  get merchantPhone() { return this.props.merchantPhone; }
  get merchantTaxId() { return this.props.merchantTaxId; }
  get transactionTime() { return this.props.transactionTime; }
  get currency() { return this.props.currency; }
  get paymentMethod() { return this.props.paymentMethod; }
  get lastFourDigits() { return this.props.lastFourDigits; }
  get invoiceNumber() { return this.props.invoiceNumber; }
  get poNumber() { return this.props.poNumber; }
  get notes() { return this.props.notes; }
  get transactionDate() { return this.props.transactionDate && date(this.props.transactionDate, 'transactionDate'); }
  get subtotal() { return this.props.subtotal === undefined ? undefined : new Decimal(this.props.subtotal!); }
  get taxAmount() { return this.props.taxAmount === undefined ? undefined : new Decimal(this.props.taxAmount!); }
  get tipAmount() { return this.props.tipAmount === undefined ? undefined : new Decimal(this.props.tipAmount!); }
  get totalAmount() { return this.props.totalAmount === undefined ? undefined : new Decimal(this.props.totalAmount!); }
  get lineItems() { return this.props.lineItems?.map(item => ({ ...item })); }
  get customFields() { return this.props.customFields === undefined ? undefined : jsonFields(this.props.customFields); }
  get createdAt() { return date(this.props.createdAt, 'createdAt'); }
  get updatedAt() { return date(this.props.updatedAt, 'updatedAt'); }
  updateDetails(data: Omit<CreateMetadataData, 'receiptId'>): void {
    const changes: Partial<ReceiptMetadataProps> = {};
    for (const field of ['merchantName', 'merchantAddress', 'merchantPhone', 'merchantTaxId', 'transactionTime', 'currency', 'paymentMethod', 'lastFourDigits', 'invoiceNumber', 'poNumber', 'notes'] as const) {
      if (data[field] !== undefined) changes[field] = data[field];
    }
    for (const field of ['subtotal', 'taxAmount', 'tipAmount', 'totalAmount'] as const) {
      if (data[field] !== undefined) changes[field] = amount(data[field], field);
    }
    if (data.transactionDate !== undefined) changes.transactionDate = data.transactionDate;
    if (data.lineItems !== undefined) changes.lineItems = data.lineItems;
    if (data.customFields !== undefined) changes.customFields = data.customFields;
    this.apply(changes);
  }
  updateMerchantInfo(data: { name?: string; address?: string; phone?: string; taxId?: string }): void {
    const changes: Partial<ReceiptMetadataProps> = {};
    if (data.name !== undefined) changes.merchantName = data.name;
    if (data.address !== undefined) changes.merchantAddress = data.address;
    if (data.phone !== undefined) changes.merchantPhone = data.phone;
    if (data.taxId !== undefined) changes.merchantTaxId = data.taxId;
    this.apply(changes);
  }
  updateTransactionInfo(value?: Date, time?: string): void {
    this.apply({ ...(value !== undefined ? { transactionDate: value } : {}), ...(time !== undefined ? { transactionTime: time } : {}) });
  }
  updateFinancialAmounts(data: { subtotal?: number | string; taxAmount?: number | string; tipAmount?: number | string; totalAmount?: number | string; currency?: string }): void {
    const changes: Partial<ReceiptMetadataProps> = {};
    for (const field of ['subtotal', 'taxAmount', 'tipAmount', 'totalAmount'] as const) if (data[field] !== undefined) changes[field] = amount(data[field], field);
    if (data.currency !== undefined) changes.currency = data.currency;
    this.apply(changes);
  }
  updatePaymentInfo(method?: string, digits?: string): void {
    this.apply({ ...(method !== undefined ? { paymentMethod: method } : {}), ...(digits !== undefined ? { lastFourDigits: digits } : {}) });
  }
  updateInvoiceInfo(invoice?: string, po?: string): void {
    this.apply({ ...(invoice !== undefined ? { invoiceNumber: invoice } : {}), ...(po !== undefined ? { poNumber: po } : {}) });
  }
  setLineItems(items: LineItem[]): void { this.apply({ lineItems: items }); }
  addLineItem(item: LineItem): void { this.setLineItems([...(this.props.lineItems ?? []), item]); }
  updateNotes(notes: string): void { this.apply({ notes }); }
  setCustomField(key: string, value: JsonValue): void { this.apply({ customFields: jsonFields({ ...this.props.customFields, [key]: value }) }); }
  removeCustomField(key: string): void {
    if (!this.props.customFields || !Object.prototype.hasOwnProperty.call(this.props.customFields, key)) return;
    const fields = jsonFields(this.props.customFields); delete fields[key]; this.apply({ customFields: fields });
  }
  hasCompleteFinancialInfo() { return this.props.totalAmount !== undefined && this.props.currency !== undefined && this.props.transactionDate !== undefined; }
  hasMerchantInfo() { return this.props.merchantName !== undefined; }
  calculateTotal(): Decimal | undefined {
    if (this.props.subtotal === undefined) return undefined;
    return this.props.subtotal.plus(this.props.taxAmount ?? 0).plus(this.props.tipAmount ?? 0);
  }
  static toDTO(metadata: ReceiptMetadata): ReceiptMetadataDTO {
    return {
      metadataId: metadata.id.getValue(), receiptId: metadata.receiptId.getValue(),
      merchantName: metadata.merchantName,
      merchantAddress: metadata.merchantAddress,
      merchantPhone: metadata.merchantPhone,
      merchantTaxId: metadata.merchantTaxId,
      transactionTime: metadata.transactionTime,
      currency: metadata.currency,
      paymentMethod: metadata.paymentMethod,
      lastFourDigits: metadata.lastFourDigits,
      invoiceNumber: metadata.invoiceNumber,
      poNumber: metadata.poNumber,
      notes: metadata.notes,
      transactionDate: metadata.transactionDate?.toISOString(),
      subtotal: metadata.subtotal?.toString(), taxAmount: metadata.taxAmount?.toString(),
      tipAmount: metadata.tipAmount?.toString(), totalAmount: metadata.totalAmount?.toString(),
      lineItems: metadata.lineItems, customFields: metadata.customFields,
      createdAt: metadata.createdAt.toISOString(), updatedAt: metadata.updatedAt.toISOString(),
    };
  }
}
