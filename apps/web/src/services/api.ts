import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/store/authStore'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const tokens = useAuthStore.getState().tokens
    if (tokens?.accessToken) {
      config.headers.Authorization = `Bearer ${tokens.accessToken}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const tokens = useAuthStore.getState().tokens
        if (tokens?.refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken: tokens.refreshToken,
          })

          const { accessToken, refreshToken } = response.data.data
          useAuthStore.getState().setAuth(
            useAuthStore.getState().user!,
            { accessToken, refreshToken, expiresIn: tokens.expiresIn }
          )

          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          return api(originalRequest)
        }
      } catch (refreshError) {
        useAuthStore.getState().clearAuth()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  signup: (data: { email: string; password: string; firstName: string; lastName: string; phone?: string }) =>
    api.post('/auth/signup', data),
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  googleLogin: (idToken: string) => api.post('/auth/google', { idToken }),
  logout: () => api.post('/auth/logout'),
}

// User API
export const userApi = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (data: Partial<{ firstName: string; lastName: string; phone: string }>) =>
    api.put('/users/me', data),
}

// Plans API
export const plansApi = {
  getPlans: () => api.get('/plans'),
  getPlan: (id: string) => api.get(`/plans/${id}`),
}

// Subscriptions API
export const subscriptionsApi = {
  getMySubscription: () => api.get('/subscriptions/my'),
  createSubscription: (data: { planId: string }) => api.post('/subscriptions', data),
  cancelSubscription: (id: string) => api.put(`/subscriptions/${id}/cancel`),
}

// Devices API
export const devicesApi = {
  getDevices: () => api.get('/devices'),
  getDevice: (id: string) => api.get(`/devices/${id}`),
  createDevice: (data: any) => api.post('/devices', data),
  updateDevice: (id: string, data: any) => api.put(`/devices/${id}`, data),
  deleteDevice: (id: string) => api.delete(`/devices/${id}`),
}

// Billing API
export const billingApi = {
  getInvoices: () => api.get('/invoices/my'),
  getInvoice: (id: string) => api.get(`/invoices/${id}`),
  downloadInvoice: (id: string) => api.get(`/invoices/${id}/download`),
  createPaymentOrder: (invoiceId: string) => api.post('/payments/create-order', { invoiceId }),
  verifyPayment: (data: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) =>
    api.post('/payments/verify', data),
}

// Support API
export const supportApi = {
  getTickets: () => api.get('/tickets/my'),
  getTicket: (id: string) => api.get(`/tickets/${id}`),
  createTicket: (data: { subject: string; description: string; category: string; priority?: string }) =>
    api.post('/tickets', data),
  addComment: (ticketId: string, content: string) =>
    api.post(`/tickets/${ticketId}/comments`, { content }),
  deleteTicket: (id: string) => api.delete(`/tickets/${id}`),
}

// Telemetry API
export const telemetryApi = {
  getSummary: () => api.get('/api/v1/telemetry/summary'),
  getRealtime: (userId: string) => api.get(`/api/v1/telemetry/${userId}/realtime`),
  getUserTelemetry: (userId: string, params?: any) => api.get(`/api/v1/telemetry/${userId}`, { params }),
}
