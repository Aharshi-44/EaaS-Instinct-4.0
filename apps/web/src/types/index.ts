export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'user' | 'admin';
  authProvider: 'local' | 'google';
  emailVerified: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  type: 'residential' | 'commercial' | 'industrial';
  basePrice: number;
  unitPrice: number;
  features: string[];
  maxDevices: number;
  isActive: boolean;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  plan?: Plan;
  status: 'active' | 'cancelled' | 'expired' | 'pending' | 'suspended';
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  currentPeriodStart: string;
  currentPeriodEnd: string;
}

export interface Device {
  id: string;
  name: string;
  type: 'smart_meter' | 'solar_inverter' | 'battery' | 'ev_charger' | 'load_controller';
  serialNumber: string;
  manufacturer: string;
  model: string;
  status: 'online' | 'offline' | 'maintenance' | 'error';
  lastSeenAt: string;
}

export interface TelemetryData {
  source: 'grid' | 'solar' | 'battery' | 'load';
  power: number;
  energy: number;
  voltage?: number;
  current?: number;
  timestamp: string;
}

export interface DashboardSummary {
  currentMonthUsage: {
    grid: number;
    solar: number;
    battery: number;
    total: number;
  };
  currentMonthCost: number;
  estimatedBill: number;
  co2Savings: number;
  activeDevices: number;
  batteryStatus?: {
    level: number;
    charging: boolean;
  };
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  status: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
  totalAmount: number;
  amountDue: number;
  pdfUrl?: string;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: 'billing' | 'technical' | 'account' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}
