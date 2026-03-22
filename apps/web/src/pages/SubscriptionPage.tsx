import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Battery, Loader2, Sun, Zap } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { clearDemoStorageForUser, demoSubscriptionKey } from '@/lib/demoStorage'

type SubscriptionPlan = {
  name: string
  price: number
  description: string
  capacity: string
  savings: string
  audience: string
  /** Visual emphasis (middle tier) */
  popular?: boolean
}

/** Legacy localStorage values from older ROI builds — map to current plan names */
const ROI_TO_PLAN_NAME: Record<string, SubscriptionPlan['name']> = {
  Basic: 'Basic Backup',
  Pro: 'Solar+Backup',
  Premium: 'Premium Green',
}

const PLAN_NAMES = ['Basic Backup', 'Solar+Backup', 'Premium Green'] as const

function readRecommendedPlan(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem('recommendedPlan')
    if (!raw) return null
    const name = raw.trim()
    if (name in ROI_TO_PLAN_NAME) return ROI_TO_PLAN_NAME[name]
    return PLAN_NAMES.includes(name as (typeof PLAN_NAMES)[number]) ? name : null
  } catch {
    return null
  }
}

function getPlanSlug(plan: SubscriptionPlan): string {
  return plan.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
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
      name: 'Basic Backup',
      price: 1024,
      description: 'Emergency power + basic solar offset',
      capacity: '1kW solar + 1kWh battery',
      savings: '₹500–800/month',
      audience: '1–2 BHK homes',
    },
    {
      name: 'Solar+Backup',
      price: 3071,
      description: 'Full daytime solar + 4–6hr backup',
      capacity: '3kW solar + 3kWh battery',
      savings: '₹1.5–2.5k/month',
      audience: 'Families, small shops',
      popular: true,
    },
    {
      name: 'Premium Green',
      price: 5415,
      description: 'High uptime + EV-ready + analytics',
      capacity: '5kW solar + 10kWh battery',
      savings: '₹3–5k/month',
      audience: 'Villas, offices',
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

  const handlePlanCardInteraction = (planName: string) => {
    setSelectedPlan(planName)
    if (planName !== initialRoiPlan) setShowRoiBanner(false)
  }

  const handleSubscribe = (plan: SubscriptionPlan) => {
    if (activePlanId) return

    const planId = getPlanSlug(plan)
    setSubscribing(planId)

    // Demo checkout on PaymentPage — subscription + invoice are saved after OTP success
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
        clearDemoStorageForUser(userId)
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
        {plans.map((plan, index) => {
          const planId = getPlanSlug(plan)
          const isPopular = plan.popular === true
          /** User clicked / keyboard-focused card (comparison) */
          const isSelected = plan.name === selectedPlan
          /** ROI flow only — not the same as click selection */
          const isRoiRecommendedCard =
            initialRoiPlan !== null && plan.name === initialRoiPlan
          const isCurrent = activePlanId === planId || activePlanName === plan.name

          const icons = [Zap, Sun, Battery] as const
          const HeaderIcon = icons[index % icons.length]

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
                'flex flex-col overflow-hidden transition-all duration-300 ease-out',
                'hover:shadow-xl hover:-translate-y-0.5',
                'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                isPopular && 'md:scale-105 border-2 border-blue-500 shadow-lg z-[1]',
                isSelected &&
                  !isCurrent &&
                  'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/30 dark:ring-blue-400',
                isCurrent && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
              )}
            >
              <CardHeader className="space-y-3 pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-xl font-bold leading-tight">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <HeaderIcon className="h-5 w-5" />
                    </span>
                    <span>{plan.name}</span>
                  </CardTitle>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {isPopular ? (
                      <Badge className="shrink-0 bg-blue-600 text-white hover:bg-blue-600 text-[10px] font-semibold uppercase tracking-wide">
                        Most Popular
                      </Badge>
                    ) : null}
                    {isRoiRecommendedCard ? (
                      <Badge
                        variant="secondary"
                        className="shrink-0 text-[10px] font-semibold uppercase tracking-wide border-blue-200 bg-white/80 dark:bg-blue-950/50"
                      >
                        Recommended for you
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <CardDescription className="text-sm leading-relaxed text-muted-foreground">
                  {plan.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1 space-y-4 pt-0">
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold tracking-tight text-foreground">
                      {formatCurrency(plan.price)}
                    </span>
                    <span className="text-muted-foreground text-sm font-medium">/month</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">No upfront cost (₹0 capex)</p>
                </div>

                <div className="rounded-lg border border-border/80 bg-muted/40 px-3 py-2.5 text-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Capacity
                  </p>
                  <p className="mt-0.5 font-medium text-foreground">{plan.capacity}</p>
                </div>

                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 dark:bg-emerald-500/15">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                    Estimated savings
                  </p>
                  <p className="mt-0.5 text-lg font-bold text-emerald-700 dark:text-emerald-400">
                    {plan.savings}
                  </p>
                </div>

                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Best for: </span>
                  {plan.audience}
                </p>
              </CardContent>

              <CardFooter className="pt-2">
                {isCurrent ? (
                  <Button className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="w-full transition-transform duration-200 active:scale-[0.98]"
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
