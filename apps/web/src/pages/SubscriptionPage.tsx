import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Zap } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { demoSubscriptionKey } from '@/lib/demoStorage'

type SubscriptionPlan = {
  name: string
  price: number
  tag: string
  capacity: string
  savings: string
  features: string[]
}

const VALID_PLAN_NAMES = ['Basic', 'Pro', 'Premium'] as const

function readRecommendedPlan(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem('recommendedPlan')
    if (!raw) return null
    const name = raw.trim()
    return VALID_PLAN_NAMES.includes(name as (typeof VALID_PLAN_NAMES)[number]) ? name : null
  } catch {
    return null
  }
}

export function SubscriptionPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()
  const [activePlanId, setActivePlanId] = useState<string | null>(null)
  const [activePlanName, setActivePlanName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState<string | null>(null)
  const [initialRoiPlan] = useState<string | null>(() => readRecommendedPlan())
  const [selectedPlan, setSelectedPlan] = useState<string | null>(initialRoiPlan)
  const [showRoiBanner, setShowRoiBanner] = useState(() => !!initialRoiPlan)

  const plans: SubscriptionPlan[] = [
    {
      name: 'Basic',
      price: 1999,
      tag: 'Starter',
      capacity: '1 kW',
      savings: 'Save ₹500/month',
      features: [
        'Basic solar access',
        'Limited battery backup',
        'Basic dashboard',
        'Monthly reports',
      ],
    },
    {
      name: 'Pro',
      price: 2999,
      tag: 'Most Popular ⭐',
      capacity: '2–3 kW',
      savings: 'Save ₹1200/month',
      features: [
        'Solar + battery hybrid',
        'Real-time dashboard',
        'Alerts & outage detection',
        'Priority support',
      ],
    },
    {
      name: 'Premium',
      price: 4999,
      tag: 'Best Value 🚀',
      capacity: '5 kW',
      savings: 'Save ₹2500/month',
      features: [
        'Full solar + battery backup',
        'Near-zero grid dependency',
        'AI optimization',
        '24/7 support',
      ],
    },
  ]

  useEffect(() => {
    const init = () => {
      const userId = user?.id
      try {
        const navState = (location.state || {}) as {
          planId?: string
          planName?: string
          planPrice?: number
        }

        if (navState.planId && navState.planName && userId) {
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
            window.localStorage.setItem(demoSubscriptionKey(userId), JSON.stringify(storedSub))
          } catch {
            // ignore
          }
        } else if (userId) {
          try {
            const stored = window.localStorage.getItem(demoSubscriptionKey(userId))
            if (stored) {
              const sub = JSON.parse(stored) as { planId: string; planName: string; status: string }
              if (sub.status === 'active') {
                setActivePlanId(sub.planId)
                setActivePlanName(sub.planName)
              }
            }
          } catch {
            // ignore
          }
        }
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [location, user?.id])

  const getPlanId = (plan: SubscriptionPlan) => plan.name.toLowerCase()

  const handlePlanCardInteraction = (planName: string) => {
    setSelectedPlan(planName)
    if (planName !== initialRoiPlan) setShowRoiBanner(false)
  }

  const handleSubscribe = (plan: SubscriptionPlan) => {
    if (activePlanId) return

    const planId = getPlanId(plan)
    setSubscribing(planId)

    // Demo checkout: PaymentPage collects card + OTP, then saves subscription and returns here
    navigate('/payment', {
      state: {
        planId,
        planName: plan.name,
        planPrice: plan.price,
      },
    })
    setTimeout(() => setSubscribing(null), 300)
  }

  const handleCancelPlan = () => {
    const ok = window.confirm('Cancel current plan for this demo?')
    if (!ok) return

    const userId = user?.id
    if (userId) {
      try {
        window.localStorage.removeItem(demoSubscriptionKey(userId))
      } catch {
        // ignore
      }
    }
    try {
      window.localStorage.removeItem('selectedPlan')
      window.localStorage.removeItem('activePlan')
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
        <h1 className="text-3xl font-bold tracking-tight">Subscription Plans</h1>
        <p className="text-muted-foreground mt-1">
          Choose the perfect plan for your energy needs
        </p>
      </div>

      {showRoiBanner && selectedPlan ? (
        <p className="text-sm text-muted-foreground animate-in fade-in slide-in-from-top-1 duration-300">
          Based on your usage, we recommend this plan — tap a card to compare or change.
        </p>
      ) : null}

      {activePlanId && (
        <Card className="border-primary bg-primary/5">
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>
              {activePlanName
                ? `${activePlanName} is active for this demo account.`
                : 'You have an active plan.'}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" onClick={handleCancelPlan}>
              Cancel Plan
            </Button>
          </CardFooter>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const planId = getPlanId(plan)
          const isPro = plan.name === 'Pro'
          const isCurrent = activePlanId === planId
          const isHighlighted = plan.name === selectedPlan

          return (
            <Card
              key={plan.name}
              role="button"
              tabIndex={0}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('button')) return
                handlePlanCardInteraction(plan.name)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handlePlanCardInteraction(plan.name)
                }
              }}
              className={cn(
                'flex flex-col transition-all duration-200 hover:shadow-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                isHighlighted &&
                  'border-2 border-blue-500 shadow-lg md:scale-105 animate-in fade-in zoom-in-95 duration-300',
                isPro && !isHighlighted && 'border-2 border-blue-500 shadow-lg md:scale-[1.02]',
                isCurrent && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
              )}
            >
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Zap className="h-5 w-5 text-primary shrink-0" />
                    {plan.name}
                  </CardTitle>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {isHighlighted ? (
                      <Badge className="shrink-0 bg-blue-600 text-white hover:bg-blue-600 text-[10px] font-semibold uppercase tracking-wide">
                        Recommended for you
                      </Badge>
                    ) : null}
                    <Badge
                      variant={isPro ? 'default' : 'secondary'}
                      className={cn(
                        'shrink-0 text-[10px] font-semibold uppercase tracking-wide',
                        isPro && !isHighlighted && 'bg-blue-600 text-white hover:bg-blue-600',
                      )}
                    >
                      {plan.tag}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold tracking-tight">
                      {formatCurrency(plan.price)}
                    </span>
                    <span className="text-muted-foreground text-sm font-medium">/month</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">No upfront cost (₹0 capex)</p>
                </div>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Capacity: </span>
                    <span className="font-medium text-foreground">{plan.capacity}</span>
                  </p>
                  <p className="font-medium text-emerald-600 dark:text-emerald-400">{plan.savings}</p>
                </div>
                <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="leading-snug">
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {isCurrent ? (
                  <Button className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSubscribe(plan)
                    }}
                    disabled={!!activePlanId}
                  >
                    {subscribing === planId ? (
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
          )
        })}
      </div>
    </div>
  )
}
