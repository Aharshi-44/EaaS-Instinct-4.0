import mongoose, { Schema, Document } from 'mongoose';

export type DiscomApplicationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type ApplicationType = 'new_connection' | 'load_enhancement' | 'category_change' | 'net_metering';

export interface IDiscomApplication extends Document {
  userId: string;
  subscriptionId: string;
  discomId: string;
  applicationType: ApplicationType;
  status: DiscomApplicationStatus;
  applicationData: Record<string, any>;
  discomReference?: string;
  submittedAt: Date;
  processedAt?: Date;
  rejectionReason?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const DiscomApplicationSchema: Schema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    subscriptionId: { type: String, required: true },
    discomId: { type: String, required: true },
    applicationType: {
      type: String,
      enum: ['new_connection', 'load_enhancement', 'category_change', 'net_metering'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
    },
    applicationData: { type: Schema.Types.Mixed, required: true },
    discomReference: { type: String },
    submittedAt: { type: Date, default: Date.now },
    processedAt: { type: Date },
    rejectionReason: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

DiscomApplicationSchema.index({ userId: 1, status: 1 });
DiscomApplicationSchema.index({ discomReference: 1 });

export default mongoose.model<IDiscomApplication>('DiscomApplication', DiscomApplicationSchema);
