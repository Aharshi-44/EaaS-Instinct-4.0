import mongoose, { Schema, Document } from 'mongoose';

export interface IComment extends Document {
  ticketId: string;
  userId: string;
  isInternal: boolean;
  content: string;
  attachments?: string[];
  createdAt: Date;
}

const CommentSchema: Schema = new Schema(
  {
    ticketId: { type: Schema.Types.ObjectId, ref: 'Ticket', required: true, index: true },
    userId: { type: String, required: true },
    isInternal: { type: Boolean, default: false },
    content: { type: String, required: true },
    attachments: [{ type: String }],
  },
  { timestamps: true }
);

CommentSchema.index({ ticketId: 1, createdAt: -1 });

export default mongoose.model<IComment>('Comment', CommentSchema);
