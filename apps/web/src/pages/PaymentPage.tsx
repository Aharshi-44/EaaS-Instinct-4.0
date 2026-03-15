import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, CreditCard, Loader2 } from 'lucide-react'

interface LocationState {
  planId?: string
  planName?: string
  planPrice?: number
}

export function PaymentPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state || {}) as LocationState

  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'details' | 'otp' | 'success'>('details')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (
      cardNumber.replace(/\s+/g, '') !== '4111111111111111' ||
      cvv !== '123' ||
      !expiry
    ) {
      setError('Use the test card 4111 1111 1111 1111, any future expiry, CVV 123.')
      return
    }

    setStep('otp')
  }

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (otp !== '1234') {
      setError('Use OTP 1234 for this demo.')
      return
    }

    setLoading(true)
    setTimeout(() => {
      try {
        const now = new Date()
        const periodStart = now.toISOString()
        const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
        const dueDate = periodEnd

        const totalAmount = typeof state.planPrice === 'number' ? state.planPrice : 999

        const demoInvoice = {
          id: 'demo-invoice-001',
          invoiceNumber: state.planName ? `INV-DEMO-${state.planName}` : 'INV-DEMO-001',
          periodStart,
          periodEnd,
          dueDate,
          status: 'paid',
          totalAmount,
          amountDue: 0,
          pdfUrl: undefined,
        }

        window.localStorage.setItem('energix-demo-invoice', JSON.stringify(demoInvoice))

        if (state.planId && state.planName && typeof state.planPrice === 'number') {
          const demoSubscription = {
            planId: state.planId,
            planName: state.planName,
            planPrice: state.planPrice,
            status: 'active',
            activatedAt: now.toISOString(),
          }
          window.localStorage.setItem('energix-demo-subscription', JSON.stringify(demoSubscription))
        }
      } catch {
        // Ignore storage errors in demo mode
      }

      setLoading(false)
      setStep('success')
      setTimeout(() => {
        navigate('/plans', {
          state: {
            planId: state.planId,
            planName: state.planName,
            planPrice: state.planPrice,
          },
        })
      }, 1500)
    }, 1000)
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Payment Successful</CardTitle>
            <CardDescription>
              {state.planName
                ? `Your ${state.planName} plan is now active.`
                : 'Your subscription is now active.'}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button
              onClick={() =>
                navigate('/plans', {
                  state: {
                    planId: state.planId,
                    planName: state.planName,
                    planPrice: state.planPrice,
                  },
                })
              }
            >
              Back to Plans
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CreditCard className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Payment</CardTitle>
          <CardDescription>
            Demo payment screen. Use the provided test details.
          </CardDescription>
        </CardHeader>

        {step === 'details' && (
          <form onSubmit={handlePay}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  placeholder="4111 1111 1111 1111"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiry">Expiry</Label>
                  <Input
                    id="expiry"
                    placeholder="MM/YY (any future date)"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvv">CVV</Label>
                  <Input
                    id="cvv"
                    placeholder="123"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full">
                Continue
              </Button>
            </CardFooter>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="otp">OTP</Label>
                <Input
                  id="otp"
                  placeholder="1234"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">Use OTP 1234 for this demo.</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Verify & Pay'
                )}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  )
}

