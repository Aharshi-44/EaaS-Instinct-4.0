import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, Loader2 } from 'lucide-react'
import { plansApi } from '@/services/api'
import { formatCurrency } from '@/lib/utils'
import { Plan } from '@/types'

const demoPlans: Plan[] = [
  {
    id: 'demo-basic',
    name: 'Basic Home',
    description: 'Perfect for small homes getting started with smart energy.',
    type: 'residential',
    basePrice: 499,
    unitPrice: 8.5,
    features: ['Live consumption view', 'Basic alerts', 'Up to 3 devices'],
    maxDevices: 3,
    isActive: true,
  },
  {
    id: 'demo-pro',
    name: 'Solar Saver',
    description: 'Optimized for homes with rooftop solar and batteries.',
    type: 'residential',
    basePrice: 999,
    unitPrice: 7.2,
    features: ['Solar optimization', 'Battery insights', 'Up to 6 devices'],
    maxDevices: 6,
    isActive: true,
  },
  {
    id: 'demo-business',
    name: 'Business Flex',
    description: 'For small businesses wanting detailed energy analytics.',
    type: 'commercial',
    basePrice: 2499,
    unitPrice: 6.8,
    features: ['Advanced analytics', 'Priority support', 'Up to 12 devices'],
    maxDevices: 12,
    isActive: true,
  },
]

export function PlansPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [plans, setPlans] = useState<Plan[]>([])
  const [activePlanId, setActivePlanId] = useState<string | null>(null)
  const [activePlanName, setActivePlanName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null)

        // Try to load plans from API; if that fails or returns empty, fall back to demo plans.
        try {
          const plansResponse = await plansApi.getPlans()
          const apiPlans = (plansResponse.data.data || []) as Plan[]
          if (apiPlans.length > 0) {
            setPlans(apiPlans)
          } else {
            setPlans(demoPlans)
          }
        } catch (err) {
          console.error('Error fetching plans from API, using demo plans instead:', err)
          setPlans(demoPlans)
        }

        // Prefer subscription info passed via navigation state (immediately after payment)
        const navState = ((location as any).state || {}) as {
          planId?: string
          planName?: string
          planPrice?: number
        }

        if (navState.planId && navState.planName) {
          setActivePlanId(navState.planId)
          setActivePlanName(navState.planName)
          try {
            const storedSub = {
              planId: navState.planId,
              planName: navState.planName,
              planPrice: navState.planPrice ?? 0,
              status: 'active',
              activatedAt: new Date().toISOString(),
            }
            window.localStorage.setItem('energix-demo-subscription', JSON.stringify(storedSub))
          } catch {
            // ignore
          }
        } else {
          // Fallback: load any stored demo subscription
          try {
            const stored = window.localStorage.getItem('energix-demo-subscription')
            if (stored) {
              const sub = JSON.parse(stored) as { planId: string; planName: string; status: string }
              if (sub.status === 'active') {
                setActivePlanId(sub.planId)
                setActivePlanName(sub.planName)
              }
            }
          } catch {
            // Ignore storage issues in demo mode
          }
        }
      } catch (error) {
        console.error('Error initializing plans page:', error)
        setError('Could not load plans right now. Please refresh and try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [location])

  const handleSubscribe = (planId: string, planName: string, planPrice: number) => {
    if (activePlanId) return

    setSubscribing(planId)
    navigate('/payment', {
      state: { planId, planName, planPrice },
    })
    setTimeout(() => setSubscribing(null), 300)
  }

  const handleCancelPlan = () => {
    const ok = window.confirm('Cancel current plan for this demo?')
    if (!ok) return

    try {
      window.localStorage.removeItem('energix-demo-subscription')
    } catch {
      // ignore
    }
    setActivePlanId(null)
    setActivePlanName(null)
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
        <h1 className="text-3xl font-bold">Plans & Subscription</h1>
        <p className="text-muted-foreground">
          Choose the perfect plan for your energy needs
        </p>
      </div>

      {activePlanId && (
        <Card className="border-primary bg-primary/5">
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>
              {activePlanName ? `${activePlanName} is active for this demo account.` : 'You have an active plan.'}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" onClick={handleCancelPlan}>
              Cancel Plan
            </Button>
          </CardFooter>
        </Card>
      )}

      {error && (
        <Card>
          <CardHeader>
            <CardTitle>Plans unavailable</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-3xl font-bold">{formatCurrency(plan.basePrice)}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">
                  + {formatCurrency(plan.unitPrice)}/kWh
                </span>
              </div>
              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="text-sm text-muted-foreground">
                Up to {plan.maxDevices} devices
              </div>
            </CardContent>
            <CardFooter>
              {activePlanId === plan.id ? (
                <Button className="w-full" disabled>
                  Current Plan
                </Button>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => handleSubscribe(plan.id, plan.name, plan.basePrice)}
                  disabled={!!activePlanId}
                >
                  {subscribing === plan.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Subscribing...
                    </>
                  ) : (
                    'Subscribe'
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
