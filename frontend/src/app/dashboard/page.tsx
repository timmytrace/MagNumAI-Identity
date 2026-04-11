'use client'
import { useEffect, useState } from 'react'
import { logsApi } from '@/lib/api'
import type { StatsResponse } from '@/types'
import StatCard from '@/components/ui/StatCard'
import {
  Activity,
  ShieldOff,
  AlertTriangle,
  Eye,
  Syringe,
  TrendingUp,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const RISK_COLORS: Record<string, string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
}

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    logsApi.stats().then((res) => {
      setStats(res.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const riskPieData = stats
    ? Object.entries(stats.risk_distribution).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }))
    : []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Security Overview</h1>
        <p className="text-gray-400 text-sm mt-1">
          Real-time AI security monitoring and threat intelligence
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Interactions"
          value={stats?.total_interactions ?? 0}
          subtitle="All time"
          icon={<Activity className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Blocked Requests"
          value={stats?.blocked_count ?? 0}
          subtitle="Threats stopped"
          icon={<ShieldOff className="w-5 h-5" />}
          color="red"
        />
        <StatCard
          title="Injection Attempts"
          value={stats?.injection_attempts ?? 0}
          subtitle="Prompt injections detected"
          icon={<Syringe className="w-5 h-5" />}
          color="orange"
        />
        <StatCard
          title="PII Detections"
          value={stats?.pii_detections ?? 0}
          subtitle="Sensitive data found"
          icon={<Eye className="w-5 h-5" />}
          color="yellow"
        />
        <StatCard
          title="Flagged"
          value={stats?.flagged_count ?? 0}
          subtitle="Needs review"
          icon={<AlertTriangle className="w-5 h-5" />}
          color="yellow"
        />
        <StatCard
          title="Avg Risk Score"
          value={`${((stats?.avg_risk_score ?? 0) * 100).toFixed(1)}%`}
          subtitle="Across all requests"
          icon={<TrendingUp className="w-5 h-5" />}
          color="blue"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Distribution Pie */}
        <div className="glass rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Risk Level Distribution</h3>
          {riskPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={riskPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {riskPieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={RISK_COLORS[entry.name.toLowerCase()] || '#6b7280'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1f2937', border: 'none', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-60 text-gray-500 text-sm">
              No data yet
            </div>
          )}
          <div className="flex flex-wrap gap-3 mt-2">
            {Object.entries(RISK_COLORS).map(([level, color]) => (
              <div key={level} className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </div>
            ))}
          </div>
        </div>

        {/* Bar chart - threat types */}
        <div className="glass rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Threat Breakdown</h3>
          {stats ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={[
                  { name: 'Injections', value: stats.injection_attempts },
                  { name: 'PII Found', value: stats.pii_detections },
                  { name: 'Blocked', value: stats.blocked_count },
                  { name: 'Flagged', value: stats.flagged_count },
                ]}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              >
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: '#1f2937', border: 'none', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-60 text-gray-500 text-sm">
              No data yet
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
