import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Layout } from '@/components/Layout'
import { LoginPage } from '@/pages/LoginPage'
import { SignupPage } from '@/pages/SignupPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { SubscriptionPage } from '@/pages/SubscriptionPage'
import { ROICalculatorPage } from '@/pages/ROICalculatorPage'
import { BillingPage } from '@/pages/BillingPage'
import { SupportPage } from '@/pages/SupportPage'
import { AdminPage } from '@/pages/AdminPage'
import { PaymentPage } from '@/pages/PaymentPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  return isAuthenticated && user?.role === 'admin' ? <>{children}</> : <Navigate to="/" />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/payment"
          element={
            <PrivateRoute>
              <PaymentPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="plans" element={<Navigate to="/subscription" replace />} />
          <Route path="subscription" element={<SubscriptionPage />} />
          <Route path="roi-calculator" element={<ROICalculatorPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="support" element={<SupportPage />} />
          <Route
            path="admin"
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
