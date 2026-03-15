import mongoose, { Schema, Document } from 'mongoose';

export interface IPlan extends Document {
  name: string;
  description: string;
  type: 'residential' | 'commercial' | 'industrial';
  basePrice: number;
  unitPrice: number;
  features: string[];
  maxDevices: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PlanSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['residential', 'commercial', 'industrial'],
      required: true,
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    features: [
      {
        type: String,
      },
    ],
    maxDevices: {
      type: Number,
      required: true,
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

PlanSchema.index({ type: 1, isActive: 1 });

export default mongoose.model<IPlan>('Plan', PlanSchema);
