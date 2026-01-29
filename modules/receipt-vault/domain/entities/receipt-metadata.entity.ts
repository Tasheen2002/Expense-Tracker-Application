import { MetadataId } from "../value-objects/metadata-id";
import { ReceiptId } from "../value-objects/receipt-id";
import { Decimal } from "@prisma/client/runtime/library";
import sanitizeHtml from "sanitize-html";

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface ReceiptMetadataProps {
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
  customFields?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
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
  customFields?: Record<string, any>;
}

export class ReceiptMetadata {
  private constructor(private props: ReceiptMetadataProps) {}

  static create(data: CreateMetadataData): ReceiptMetadata {
    return new ReceiptMetadata({
      id: MetadataId.create(),
      receiptId: ReceiptId.fromString(data.receiptId),
      merchantName: data.merchantName,
      merchantAddress: data.merchantAddress,
      merchantPhone: data.merchantPhone,
      merchantTaxId: data.merchantTaxId,
      transactionDate: data.transactionDate,
      transactionTime: data.transactionTime,
      subtotal: data.subtotal ? new Decimal(data.subtotal) : undefined,
      taxAmount: data.taxAmount ? new Decimal(data.taxAmount) : undefined,
      tipAmount: data.tipAmount ? new Decimal(data.tipAmount) : undefined,
      totalAmount: data.totalAmount ? new Decimal(data.totalAmount) : undefined,
      currency: data.currency,
      paymentMethod: data.paymentMethod,
      lastFourDigits: data.lastFourDigits,
      invoiceNumber: data.invoiceNumber,
      poNumber: data.poNumber,
      lineItems: data.lineItems,
      notes: data.notes
        ? sanitizeHtml(data.notes, {
            allowedTags: [], // Notes should be plain text
            allowedAttributes: {},
          })
        : undefined,
      customFields: data.customFields,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromPersistence(props: ReceiptMetadataProps): ReceiptMetadata {
    return new ReceiptMetadata(props);
  }

  // Getters
  getId(): MetadataId {
    return this.props.id;
  }

  getReceiptId(): ReceiptId {
    return this.props.receiptId;
  }

  getMerchantName(): string | undefined {
    return this.props.merchantName;
  }

  getMerchantAddress(): string | undefined {
    return this.props.merchantAddress;
  }

  getMerchantPhone(): string | undefined {
    return this.props.merchantPhone;
  }

  getMerchantTaxId(): string | undefined {
    return this.props.merchantTaxId;
  }

  getTransactionDate(): Date | undefined {
    return this.props.transactionDate;
  }

  getTransactionTime(): string | undefined {
    return this.props.transactionTime;
  }

  getSubtotal(): Decimal | undefined {
    return this.props.subtotal;
  }

  getTaxAmount(): Decimal | undefined {
    return this.props.taxAmount;
  }

  getTipAmount(): Decimal | undefined {
    return this.props.tipAmount;
  }

  getTotalAmount(): Decimal | undefined {
    return this.props.totalAmount;
  }

  getCurrency(): string | undefined {
    return this.props.currency;
  }

  getPaymentMethod(): string | undefined {
    return this.props.paymentMethod;
  }

  getLastFourDigits(): string | undefined {
    return this.props.lastFourDigits;
  }

  getInvoiceNumber(): string | undefined {
    return this.props.invoiceNumber;
  }

  getPoNumber(): string | undefined {
    return this.props.poNumber;
  }

  getLineItems(): LineItem[] | undefined {
    return this.props.lineItems;
  }

  getNotes(): string | undefined {
    return this.props.notes;
  }

  getCustomFields(): Record<string, any> | undefined {
    return this.props.customFields;
  }

  getCreatedAt(): Date {
    return this.props.createdAt;
  }

  getUpdatedAt(): Date {
    return this.props.updatedAt;
  }

  // Business logic methods
  updateMerchantInfo(data: {
    name?: string;
    address?: string;
    phone?: string;
    taxId?: string;
  }): void {
    if (data.name !== undefined) {
      this.props.merchantName = data.name || undefined;
    }
    if (data.address !== undefined) {
      this.props.merchantAddress = data.address || undefined;
    }
    if (data.phone !== undefined) {
      this.props.merchantPhone = data.phone || undefined;
    }
    if (data.taxId !== undefined) {
      this.props.merchantTaxId = data.taxId || undefined;
    }

    this.props.updatedAt = new Date();
  }

  updateTransactionInfo(date?: Date, time?: string): void {
    if (date !== undefined) {
      this.props.transactionDate = date;
    }
    if (time !== undefined) {
      this.props.transactionTime = time || undefined;
    }

    this.props.updatedAt = new Date();
  }

  updateFinancialAmounts(data: {
    subtotal?: number | string;
    taxAmount?: number | string;
    tipAmount?: number | string;
    totalAmount?: number | string;
    currency?: string;
  }): void {
    if (data.subtotal !== undefined) {
      this.props.subtotal = data.subtotal
        ? new Decimal(data.subtotal)
        : undefined;
    }
    if (data.taxAmount !== undefined) {
      this.props.taxAmount = data.taxAmount
        ? new Decimal(data.taxAmount)
        : undefined;
    }
    if (data.tipAmount !== undefined) {
      this.props.tipAmount = data.tipAmount
        ? new Decimal(data.tipAmount)
        : undefined;
    }
    if (data.totalAmount !== undefined) {
      this.props.totalAmount = data.totalAmount
        ? new Decimal(data.totalAmount)
        : undefined;
    }
    if (data.currency !== undefined) {
      this.props.currency = data.currency || undefined;
    }

    this.props.updatedAt = new Date();
  }

  updatePaymentInfo(method?: string, lastFourDigits?: string): void {
    if (method !== undefined) {
      this.props.paymentMethod = method || undefined;
    }
    if (lastFourDigits !== undefined) {
      this.props.lastFourDigits = lastFourDigits || undefined;
    }

    this.props.updatedAt = new Date();
  }

  updateInvoiceInfo(invoiceNumber?: string, poNumber?: string): void {
    if (invoiceNumber !== undefined) {
      this.props.invoiceNumber = invoiceNumber || undefined;
    }
    if (poNumber !== undefined) {
      this.props.poNumber = poNumber || undefined;
    }

    this.props.updatedAt = new Date();
  }

  setLineItems(lineItems: LineItem[]): void {
    this.props.lineItems = lineItems;
    this.props.updatedAt = new Date();
  }

  addLineItem(item: LineItem): void {
    if (!this.props.lineItems) {
      this.props.lineItems = [];
    }

    this.props.lineItems.push(item);
    this.props.updatedAt = new Date();
  }

  updateNotes(notes: string): void {
    this.props.notes = notes
      ? sanitizeHtml(notes, {
          allowedTags: [], // Notes should be plain text
          allowedAttributes: {},
        })
      : undefined;
    this.props.updatedAt = new Date();
  }

  setCustomField(key: string, value: any): void {
    if (!this.props.customFields) {
      this.props.customFields = {};
    }

    this.props.customFields[key] = value;
    this.props.updatedAt = new Date();
  }

  removeCustomField(key: string): void {
    if (!this.props.customFields) {
      return;
    }

    delete this.props.customFields[key];
    this.props.updatedAt = new Date();
  }

  hasCompleteFinancialInfo(): boolean {
    return !!(
      this.props.totalAmount &&
      this.props.currency &&
      this.props.transactionDate
    );
  }

  hasMerchantInfo(): boolean {
    return !!this.props.merchantName;
  }

  calculateTotal(): Decimal | undefined {
    if (!this.props.subtotal) {
      return undefined;
    }

    let total = this.props.subtotal;

    if (this.props.taxAmount) {
      total = total.plus(this.props.taxAmount);
    }

    if (this.props.tipAmount) {
      total = total.plus(this.props.tipAmount);
    }

    return total;
  }
}
