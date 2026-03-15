// ============================================
// EnergiX Shared Types
// ============================================

// User & Authentication
export interface User {
  id: string;
  email: string;
  password?: string; // Hashed, only for local auth
  firstName: string;
  lastName: string;
  phone?: string;
  authProvider: 'local' | 'google';
  googleId?: string;
  role: 'user' | 'admin';
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin';
  authProvider: 'local' | 'google';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Plans & Subscriptions
export interface Plan {
  id: string;
  name: string;
  description: string;
  type: 'residential' | 'commercial' | 'industrial';
  basePrice: number;
  unitPrice: number; // per kWh
  features: string[];
  maxDevices: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'pending' | 'suspended';

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  plan?: Plan;
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date;
  autoRenew: boolean;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Devices & Telemetry
export interface Device {
  id: string;
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

export interface TelemetryData {
  id?: string;
  deviceId: string;
  userId: string;
  timestamp: Date;
  metrics: {
    voltage?: number; // V
    current?: number; // A
    power?: number; // W
    energy?: number; // kWh (cumulative)
    frequency?: number; // Hz
    powerFactor?: number;
    temperature?: number; // °C
  };
  source: 'grid' | 'solar' | 'battery' | 'load';
  quality: 'good' | 'poor' | 'suspect' | 'missing';
}

export interface AggregatedTelemetry {
  userId: string;
  deviceId: string;
  bucket: Date;
  interval: '1m' | '5m' | '15m' | '1h' | '1d';
  avgVoltage?: number;
  avgCurrent?: number;
  avgPower?: number;
  totalEnergy: number;
  maxPower?: number;
  minPower?: number;
  source: 'grid' | 'solar' | 'battery' | 'load';
}

// Billing & Invoices
export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled' | 'refunded';

export interface Invoice {
  id: string;
  userId: string;
  subscriptionId: string;
  invoiceNumber: string;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  status: InvoiceStatus;
  lineItems: InvoiceLineItem[];
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

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  type: 'subscription' | 'usage' | 'tax' | 'discount' | 'fee';
}

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

export interface Payment {
  id: string;
  userId: string;
  invoiceId: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod?: string;
  failureReason?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Support Tickets
export type TicketStatus = 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketCategory = 'billing' | 'technical' | 'account' | 'general';

export interface Ticket {
  id: string;
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

export interface TicketComment {
  id: string;
  ticketId: string;
  userId: string;
  isInternal: boolean;
  content: string;
  attachments?: string[];
  createdAt: Date;
}

// DISCOM Integration
export type DiscomApplicationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface DiscomApplication {
  id: string;
  userId: string;
  subscriptionId: string;
  discomId: string;
  applicationType: 'new_connection' | 'load_enhancement' | 'category_change' | 'net_metering';
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

// Dashboard & Analytics
export interface DashboardSummary {
  userId: string;
  currentMonthUsage: {
    grid: number;
    solar: number;
    battery: number;
    total: number;
  };
  currentMonthCost: number;
  estimatedBill: number;
  co2Savings: number; // kg
  activeDevices: number;
  batteryStatus?: {
    level: number; // percentage
    charging: boolean;
    estimatedTimeRemaining?: number; // minutes
  };
  alerts: Alert[];
}

export interface Alert {
  id: string;
  userId: string;
  deviceId?: string;
  type: 'usage_spike' | 'device_offline' | 'billing' | 'system' | 'maintenance';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

// API Responses
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

// Health Check
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  version: string;
  checks: {
    name: string;
    status: 'up' | 'down';
    responseTime?: number;
    message?: string;
  }[];
}
