import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download, CreditCard, Loader2 } from 'lucide-react'
import { billingApi } from '@/services/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { readDemoInvoiceRaw } from '@/lib/demoStorage'
import { useAuthStore } from '@/store/authStore'
import { Invoice } from '@/types'

export function BillingPage() {
  const { user } = useAuthStore()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState<string | null>(null)

  useEffect(() => {
    const loadInvoices = () => {
      try {
        // Prototype: show only the per-user demo invoice after fake payment.
        // We do not merge GET /invoices here — seeded or shared backend data was
        // appearing for every new user before they purchased.
        const stored = readDemoInvoiceRaw(user?.id)
        if (stored) {
          const demoInvoice = JSON.parse(stored) as Invoice
          setInvoices([demoInvoice])
        } else {
          setInvoices([])
        }
      } catch {
        setInvoices([])
      } finally {
        setLoading(false)
      }
    }

    loadInvoices()
  }, [user?.id])

  const handlePay = async (invoiceId: string) => {
    setPaying(invoiceId)
    try {
      const orderResponse = await billingApi.createPaymentOrder(invoiceId)
      const { order, keyId } = orderResponse.data.data

      // Load Razorpay script and open checkout
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      document.body.appendChild(script)

      script.onload = () => {
        const options = {
          key: keyId,
          amount: order.amount,
          currency: order.currency,
          name: 'EnergiX',
          description: 'Invoice Payment',
          order_id: order.id,
          handler: async (response: any) => {
            try {
              await billingApi.verifyPayment({
                razorpayOrderId: order.id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              })
              const raw = readDemoInvoiceRaw(user?.id)
              setInvoices(raw ? [JSON.parse(raw) as Invoice] : [])
            } catch (error) {
              console.error('Payment verification failed:', error)
            }
          },
          prefill: {
            email: '',
          },
          theme: {
            color: '#3b82f6',
          },
        }

        const rzp = new (window as any).Razorpay(options)
        rzp.open()
      }
    } catch (error) {
      console.error('Error creating payment:', error)
    } finally {
      setPaying(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      paid: 'default',
      pending: 'secondary',
      overdue: 'destructive',
      cancelled: 'outline',
    }
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing & Invoices</h1>
        <p className="text-muted-foreground">Manage your payments and view invoice history</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Your billing history and payment status</CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No invoices found
            </div>
          ) : (
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{invoice.invoiceNumber}</span>
                      {getStatusBadge(invoice.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Period: {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Due: {formatDate(invoice.dueDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(invoice.totalAmount)}</p>
                      {invoice.amountDue > 0 && (
                        <p className="text-sm text-muted-foreground">
                          Due: {formatCurrency(invoice.amountDue)}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {invoice.status === 'pending' && invoice.amountDue > 0 && (
                        <Button
                          size="sm"
                          onClick={() => handlePay(invoice.id)}
                          disabled={paying === invoice.id}
                        >
                          {paying === invoice.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CreditCard className="h-4 w-4 mr-1" />
                              Pay
                            </>
                          )}
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
