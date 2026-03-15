import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Zap, Sun, Battery, TrendingDown, DollarSign, Activity } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { telemetryApi, devicesApi } from '@/services/api'
import { formatCurrency } from '@/lib/utils'
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
  const [realtimeData, setRealtimeData] = useState<RealtimeData>({})
  const [activeDevices, setActiveDevices] = useState(0)
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState<any[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch realtime telemetry
        if (user?.id) {
          const response = await telemetryApi.getRealtime(user.id)
          setRealtimeData(response.data.data || {})
        }

        // Fetch devices
        const devicesResponse = await devicesApi.getDevices()
        const devices = devicesResponse.data.data || []
        setActiveDevices(devices.filter((d: any) => d.status === 'online').length)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Poll for realtime updates
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [user?.id])

  // Generate mock chart data
  useEffect(() => {
    const data = []
    const now = new Date()
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000)
      data.push({
        time: time.getHours() + ':00',
        grid: Math.round(300 + Math.random() * 400),
        solar: Math.round(Math.max(0, Math.sin((time.getHours() - 6) / 12 * Math.PI) * 4000)),
        battery: Math.round((Math.random() - 0.5) * 1000),
      })
    }
    setChartData(data)
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Loading your energy overview…</p>
        </div>
      </div>
    )
  }

  const gridPower = realtimeData.grid?.power || 0
  const solarPower = realtimeData.solar?.power || 0
  const batteryPower = realtimeData.battery?.power || 0
  const batteryLevel = realtimeData.battery?.batteryLevel || 50

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
      value: formatCurrency(2450),
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.firstName}! Here's your energy overview.
        </p>
      </div>

      {/* Real-time Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
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
            <Card key={card.title}>
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
      <Card>
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
