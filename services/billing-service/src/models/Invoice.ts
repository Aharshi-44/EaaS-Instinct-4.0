import mongoose, { Schema, Document } from 'mongoose';

export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled' | 'refunded';

export interface IInvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  type: 'subscription' | 'usage' | 'tax' | 'discount' | 'fee';
}

export interface IInvoice extends Document {
  userId: string;
  subscriptionId: string;
  invoiceNumber: string;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  status: InvoiceStatus;
  lineItems: IInvoiceLineItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  pdfUrl?: string;
  s3Key?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const LineItemSchema: Schema = new Schema({
  description: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['subscription', 'usage', 'tax', 'discount', 'fee'], required: true },
});

const InvoiceSchema: Schema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    subscriptionId: { type: String, required: true },
    invoiceNumber: { type: String, required: true, unique: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['draft', 'pending', 'paid', 'overdue', 'cancelled', 'refunded'],
      default: 'draft',
    },
    lineItems: [LineItemSchema],
    subtotal: { type: Number, required: true },
    taxAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    amountPaid: { type: Number, default: 0 },
    amountDue: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    pdfUrl: String,
    s3Key: String,
    metadata: Schema.Types.Mixed,
  },
  { timestamps: true }
);

InvoiceSchema.index({ userId: 1, status: 1 });
InvoiceSchema.index({ invoiceNumber: 1 });
InvoiceSchema.index({ dueDate: 1 });

export default mongoose.model<IInvoice>('Invoice', InvoiceSchema);
