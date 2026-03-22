import { useEffect, useState, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Zap, Sun, Battery, TrendingDown, DollarSign, Activity, Lock } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { telemetryApi, devicesApi } from '@/services/api'
import { formatCurrency, formatTimeHHMMSS } from '@/lib/utils'
import { readSubscriptionActiveForUser, subscriptionStorageKeyMatches } from '@/lib/demoStorage'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'

interface RealtimeData {
  grid?: { power: number; timestamp: string }
  solar?: { power: number; timestamp: string }
  battery?: { power: number; timestamp: string; batteryLevel?: number }
  load?: { power: number; timestamp: string }
}

export function DashboardPage() {
  const { user } = useAuthStore()
  const location = useLocation()
  const [subscriptionActive, setSubscriptionActive] = useState(() =>
    readSubscriptionActiveForUser(useAuthStore.getState().user?.id)
  )
  const [realtimeData, setRealtimeData] = useState<RealtimeData>({})
  const [activeDevices, setActiveDevices] = useState(0)
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState<any[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [alerts, setAlerts] = useState<string[]>([])
  const chartDataRef = useRef<any[]>([])
  const realtimeRef = useRef<RealtimeData>({})

  // Re-check subscription when user or route changes (e.g. after purchase) or other tabs updating storage
  useEffect(() => {
    setSubscriptionActive(readSubscriptionActiveForUser(user?.id))
  }, [location.pathname, location.key, user?.id])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || subscriptionStorageKeyMatches(useAuthStore.getState().user?.id, e.key)) {
        setSubscriptionActive(readSubscriptionActiveForUser(useAuthStore.getState().user?.id))
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    if (!subscriptionActive) {
      setLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        let gridPower = 0
        let solarPower = 0
        let devicesCount = 0

        // Fetch realtime telemetry (with demo fallback if API fails)
        try {
          if (user?.id) {
            const response = await telemetryApi.getRealtime(user.id)
            const data = response.data.data || {}
            setRealtimeData(data)
            gridPower = data.grid?.power ?? 0
            solarPower = data.solar?.power ?? 0
          }
        } catch {
          // Demo mode fallback: generate mock realtime values
          gridPower = Math.round(400 + Math.random() * 800)
          solarPower = Math.round(Math.max(0, Math.sin((new Date().getHours() - 6) / 12 * Math.PI) * 3500))
          setRealtimeData({
            grid: { power: gridPower, timestamp: new Date().toISOString() },
            solar: { power: solarPower, timestamp: new Date().toISOString() },
            battery: { power: Math.round((Math.random() - 0.5) * 500), batteryLevel: 50 + Math.round(Math.random() * 30), timestamp: new Date().toISOString() },
          })
        }

        // Fetch devices (with demo fallback)
        try {
          const devicesResponse = await devicesApi.getDevices()
          const devices = devicesResponse.data.data || []
          devicesCount = devices.filter((d: any) => d.status === 'online').length
          setActiveDevices(devicesCount)
        } catch {
          devicesCount = Math.floor(Math.random() * 4) + 1
          setActiveDevices(devicesCount)
        }

        setLastUpdated(new Date())

        // Compute alerts
        const newAlerts: string[] = []
        if (gridPower > 2500) {
          newAlerts.push('⚠️ High energy usage detected')
        }
        if (Math.random() > 0.95) {
          newAlerts.push('⚡ Grid outage detected → switched to battery')
        }
        setAlerts(newAlerts)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        setLastUpdated(new Date())
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [user?.id, subscriptionActive])

  // Initial chart data (only when subscription is active)
  useEffect(() => {
    if (!subscriptionActive) return

    const data: any[] = []
    const now = new Date()
    for (let i = 19; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 3 * 60 * 1000)
      data.push({
        time: time.getHours() + ':' + String(time.getMinutes()).padStart(2, '0'),
        grid: Math.round(300 + Math.random() * 400),
        solar: Math.round(Math.max(0, Math.sin((time.getHours() - 6) / 12 * Math.PI) * 4000)),
        battery: Math.round((Math.random() - 0.5) * 1000),
      })
    }
    chartDataRef.current = data
    setChartData(data)
  }, [subscriptionActive])

  realtimeRef.current = realtimeData

  // Update chart every 3 seconds (append new point, keep last ~20)
  useEffect(() => {
    if (!subscriptionActive) return

    const interval = setInterval(() => {
      const now = new Date()
      const rt = realtimeRef.current
      const gridPower = rt.grid?.power ?? 300 + Math.random() * 400
      const solarPower = rt.solar?.power ?? Math.max(0, Math.sin((now.getHours() - 6) / 12 * Math.PI) * 3500)
      const newPoint = {
        time: now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0'),
        grid: Math.round(gridPower * 0.9 + Math.random() * 100),
        solar: Math.round(solarPower),
        battery: Math.round((Math.random() - 0.5) * 800),
      }
      setChartData((prev) => {
        const next = [...prev, newPoint].slice(-20)
        chartDataRef.current = next
        return next
      })
    }, 3000)
    return () => clearInterval(interval)
  }, [subscriptionActive])

  if (!subscriptionActive) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.firstName}! Your energy overview will appear here once you subscribe.
          </p>
        </div>

        <div className="relative min-h-[420px] rounded-xl border bg-card/30 overflow-hidden">
          {/* Blurred placeholder — no real telemetry loaded */}
          <div className="pointer-events-none select-none blur-md opacity-60 p-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <div className="h-4 w-20 rounded bg-muted" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 w-24 rounded bg-muted mb-2" />
                    <div className="h-3 w-28 rounded bg-muted" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader>
                <div className="h-5 w-48 rounded bg-muted" />
                <div className="h-4 w-64 rounded bg-muted mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-[220px] rounded-lg bg-muted/80" />
              </CardContent>
            </Card>
          </div>

          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-background/70 backdrop-blur-sm px-6 text-center">
            <div className="rounded-full bg-primary/10 p-4 ring-2 ring-primary/20">
              <Lock className="h-12 w-12 text-primary" aria-hidden />
            </div>
            <div className="max-w-md space-y-2">
              <p className="text-lg font-semibold">Dashboard locked</p>
              <p className="text-sm text-muted-foreground">
                Subscribe to an EnergiX plan to unlock live telemetry, billing insights, and your energy dashboard.
              </p>
            </div>
            <Button asChild size="lg">
              <Link to="/subscription">Subscribe to a plan</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Loading your energy overview…</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 w-24 rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 rounded bg-muted mb-2" />
                <div className="h-3 w-32 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const gridPower = realtimeData.grid?.power || 0
  const solarPower = realtimeData.solar?.power || 0
  const batteryPower = realtimeData.battery?.power || 0
  const batteryLevel = realtimeData.battery?.batteryLevel || 50

  const estimatedBill = (gridPower / 1000) * 8 * 24

  const stats = [
    {
      title: 'Grid Usage',
      value: `${(gridPower / 1000).toFixed(2)} kW`,
      description: 'Current draw from grid',
      icon: Zap,
      color: 'text-blue-500',
    },
    {
      title: 'Solar Generation',
      value: `${(solarPower / 1000).toFixed(2)} kW`,
      description: 'Current solar output',
      icon: Sun,
      color: 'text-yellow-500',
    },
    {
      title: 'Battery Status',
      value: `${batteryLevel}%`,
      description: batteryPower > 0 ? 'Discharging' : batteryPower < 0 ? 'Charging' : 'Idle',
      icon: Battery,
      color: batteryLevel > 50 ? 'text-green-500' : 'text-orange-500',
    },
    {
      title: 'Active Devices',
      value: activeDevices.toString(),
      description: 'Online devices',
      icon: Activity,
      color: 'text-purple-500',
    },
  ]

  const summaryCards = [
    {
      title: 'Estimated Bill',
      value: formatCurrency(estimatedBill),
      change: '+12% from last month',
      icon: DollarSign,
    },
    {
      title: 'CO2 Savings',
      value: '156 kg',
      change: 'This month',
      icon: TrendingDown,
    },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.firstName}! Here's your energy overview.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Last updated: {formatTimeHHMMSS(lastUpdated)}
        </p>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={`rounded-lg border px-4 py-3 text-sm font-medium transition-opacity duration-200 ${
                alert.includes('outage')
                  ? 'border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400'
                  : 'border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
              }`}
            >
              {alert}
            </div>
          ))}
        </div>
      )}

      {/* Real-time Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="transition-all duration-200 hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold transition-opacity duration-200">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {summaryCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title} className="transition-all duration-200 hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground">{card.change}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Energy Chart */}
      <Card className="transition-all duration-200">
        <CardHeader>
          <CardTitle>Energy Consumption (24h)</CardTitle>
          <CardDescription>Real-time energy usage by source</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="solar"
                  stackId="1"
                  stroke="#eab308"
                  fill="#fef08a"
                  name="Solar"
                />
                <Area
                  type="monotone"
                  dataKey="grid"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="#bfdbfe"
                  name="Grid"
                />
                <Area
                  type="monotone"
                  dataKey="battery"
                  stackId="1"
                  stroke="#22c55e"
                  fill="#bbf7d0"
                  name="Battery"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
