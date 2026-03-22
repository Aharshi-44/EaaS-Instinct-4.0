import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import { ArrowRight, Calculator, DollarSign, TrendingDown } from 'lucide-react'

const BILL_MIN = 500
const BILL_MAX = 8000
const DEFAULT_BILL = 2000
const SOLAR_COST = 600_000
/** Modelled share of bill saved via optimisation / smart metering (rest of story is subscription vs raw bill). */
const EFFICIENCY_RATE = 0.12
type PlanTier = 'Basic' | 'Pro' | 'Premium'

function getRecommendedPlan(monthlyBill: number): { name: PlanTier; price: number } {
  if (monthlyBill <= 2000) return { name: 'Basic', price: 1999 }
  if (monthlyBill > 2000 && monthlyBill <= 4000) return { name: 'Pro', price: 2999 }
  return { name: 'Premium', price: 4999 }
}

/**
 * Usage-aligned subscription for savings math. When the tier list price is above the user's bill
 * (e.g. Pro ₹2,999 vs bill ₹2,200, or Premium ₹4,999 vs bill ₹4,200), comparing to full list price
 * makes net savings negative — we cap the modeled cost so the estimate stays meaningful (demo UX).
 * List price is still shown separately in the UI.
 */
function getModeledSubscriptionForSavings(monthlyBill: number, tierListPrice: number): number {
  const scaled = Math.round(monthlyBill * 0.92 + 80)
  return Math.round(Math.max(349, Math.min(tierListPrice, scaled)))
}

export function ROICalculatorPage() {
  const navigate = useNavigate()
  const [monthlyBill, setMonthlyBill] = useState(DEFAULT_BILL)

  const result = useMemo(() => {
    const { name, price } = getRecommendedPlan(monthlyBill)
    const efficiencyCredit = Math.round(monthlyBill * EFFICIENCY_RATE)
    const modeledSubscription = getModeledSubscriptionForSavings(monthlyBill, price)
    const usesScaledSubscription = modeledSubscription !== price
    // Net benefit uses modeled subscription whenever list price would dominate the bill; list price stays on the tier card
    const monthlySavings = monthlyBill - modeledSubscription + efficiencyCredit
    const yearlySavings = monthlySavings * 12
    const hasPositiveSavings = monthlySavings > 0
    const roiYears =
      hasPositiveSavings && yearlySavings > 0 ? SOLAR_COST / yearlySavings : null

    return {
      planName: name,
      planPrice: price,
      modeledSubscription,
      usesScaledSubscription,
      efficiencyCredit,
      monthlySavings,
      yearlySavings,
      hasPositiveSavings,
      roiYears,
    }
  }, [monthlyBill])

  const handleContinueWithPlan = () => {
    try {
      window.localStorage.setItem('recommendedPlan', result.planName)
    } catch {
      // ignore
    }
    navigate('/subscription')
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Calculator className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">ROI Calculator</h1>
            <p className="text-muted-foreground">
              Estimate your savings with EnergiX subscriptions
            </p>
          </div>
        </div>
      </div>

      <Card className="transition-shadow duration-200 hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Monthly electricity bill</CardTitle>
          <CardDescription>
            Adjust the slider to match your typical monthly spend (₹{BILL_MIN.toLocaleString('en-IN')} – ₹
            {BILL_MAX.toLocaleString('en-IN')})
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="bill-slider" className="text-base font-medium">
                Monthly Electricity Bill (₹)
              </Label>
              <span className="text-lg font-semibold tabular-nums text-primary">
                {formatCurrency(monthlyBill)}
              </span>
            </div>
            <input
              id="bill-slider"
              type="range"
              min={BILL_MIN}
              max={BILL_MAX}
              step={100}
              value={monthlyBill}
              onChange={(e) => setMonthlyBill(Number(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-muted accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>₹{BILL_MIN.toLocaleString('en-IN')}</span>
              <span>₹{BILL_MAX.toLocaleString('en-IN')}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground border-t pt-4">
            No upfront subscription cost compared to a typical ₹5–8L rooftop solar installation.
          </p>
        </CardContent>
      </Card>

      <Card
        className={`border-2 transition-all duration-300 ${
          result.hasPositiveSavings
            ? 'border-primary/40 bg-primary/5 shadow-sm'
            : 'border-muted'
        }`}
      >
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-xl">Your estimate</CardTitle>
            {result.hasPositiveSavings && (
              <Badge className="font-semibold">Recommended: {result.planName}</Badge>
            )}
          </div>
          <CardDescription>
            Based on EnergiX subscription tiers (Basic / Pro / Premium). Savings include an estimated{' '}
            {Math.round(EFFICIENCY_RATE * 100)}% reduction in energy spend from optimisation and
            monitoring. When your bill is below the tier list price (e.g. after moving to Pro or
            Premium), the estimate uses a usage-scaled subscription cost instead of the full list
            price so the numbers stay realistic.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!result.hasPositiveSavings ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-800 dark:text-amber-200">
              No net savings in this scenario — try a higher monthly bill or check inputs.
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border bg-card p-4 transition-colors">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Recommended plan
              </p>
              <p className="mt-1 text-2xl font-bold text-primary">{result.planName}</p>
              <p className="text-sm text-muted-foreground">
                List from {formatCurrency(result.planPrice)}/mo
              </p>
              {result.usesScaledSubscription ? (
                <p className="text-xs text-muted-foreground mt-2 border-t pt-2">
                  Estimate uses modeled subscription{' '}
                  <span className="font-medium text-foreground">
                    {formatCurrency(result.modeledSubscription)}/mo
                  </span>{' '}
                  (usage-aligned) because your bill is below the full list price for this tier.
                </p>
              ) : null}
            </div>
            <div className="rounded-lg border bg-card p-4 transition-colors">
              <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <DollarSign className="h-3.5 w-3.5" />
                Monthly savings
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {formatCurrency(Math.max(0, result.monthlySavings))}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Includes ~{formatCurrency(result.efficiencyCredit)}/mo modelled efficiency savings
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4 transition-colors">
              <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <TrendingDown className="h-3.5 w-3.5" />
                Yearly savings
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-green-600 dark:text-green-400">
                {result.hasPositiveSavings ? formatCurrency(result.yearlySavings) : '—'}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4 transition-colors">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                ROI vs solar (years)
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {result.roiYears != null && Number.isFinite(result.roiYears)
                  ? `${result.roiYears.toFixed(1)} yrs`
                  : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Solar install ≈ {formatCurrency(SOLAR_COST)} ÷ yearly savings
              </p>
            </div>
          </div>
        </CardContent>
        {result.hasPositiveSavings ? (
          <CardFooter className="flex flex-col items-stretch gap-2 border-t pt-6">
            <p className="text-center text-sm text-muted-foreground">
              Based on your usage, we recommend the <span className="font-semibold text-foreground">{result.planName}</span>{' '}
              plan.
            </p>
            <Button type="button" size="lg" className="gap-2" onClick={handleContinueWithPlan}>
              Continue with this Plan
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        ) : null}
      </Card>
    </div>
  )
}
