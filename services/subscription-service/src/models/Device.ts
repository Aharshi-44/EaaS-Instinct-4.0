import mongoose, { Schema, Document } from 'mongoose';

export interface IDevice extends Omit<Document, 'model'> {
  userId: string;
  subscriptionId: string;
  name: string;
  type: 'smart_meter' | 'solar_inverter' | 'battery' | 'ev_charger' | 'load_controller';
  serialNumber: string;
  manufacturer: string;
  model: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  status: 'online' | 'offline' | 'maintenance' | 'error';
  firmwareVersion: string;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DeviceSchema: Schema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscription',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['smart_meter', 'solar_inverter', 'battery', 'ev_charger', 'load_controller'],
      required: true,
    },
    serialNumber: {
      type: String,
      required: true,
      unique: true,
    },
    manufacturer: {
      type: String,
      required: true,
    },
    model: {
      type: String,
      required: true,
    },
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      address: { type: String, required: true },
    },
    status: {
      type: String,
      enum: ['online', 'offline', 'maintenance', 'error'],
      default: 'offline',
    },
    firmwareVersion: {
      type: String,
      default: '1.0.0',
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

DeviceSchema.index({ userId: 1, status: 1 });
DeviceSchema.index({ serialNumber: 1 });

export default mongoose.model<IDevice>('Device', DeviceSchema);
