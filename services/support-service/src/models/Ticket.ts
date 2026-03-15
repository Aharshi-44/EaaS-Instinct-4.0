import mongoose, { Schema, Document } from 'mongoose';

export type TicketStatus = 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketCategory = 'billing' | 'technical' | 'account' | 'general';

export interface ITicket extends Document {
  ticketNumber: string;
  userId: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  slaDeadline?: Date;
  metadata?: Record<string, any>;
}

const TicketSchema: Schema = new Schema(
  {
    ticketNumber: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ['billing', 'technical', 'account', 'general'],
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'],
      default: 'open',
    },
    assignedTo: { type: String },
    resolvedAt: { type: Date },
    closedAt: { type: Date },
    slaDeadline: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

TicketSchema.index({ userId: 1, status: 1 });
TicketSchema.index({ ticketNumber: 1 });
TicketSchema.index({ priority: 1, createdAt: 1 });

export default mongoose.model<ITicket>('Ticket', TicketSchema);
