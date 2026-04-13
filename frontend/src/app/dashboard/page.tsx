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
  Shield,
  Zap,
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
  AreaChart,
  Area,
} from 'recharts'

const RISK_COLORS: Record<string, string> = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
}

const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    background: 'rgba(15,23,42,0.95)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    padding: '10px 14px',
  },
  labelStyle: { color: '#94a3b8', fontSize: '12px', fontWeight: 500 },
  itemStyle: { color: '#e2e8f0', fontSize: '13px' },
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

  const threatBarData = stats
    ? [
        { name: 'Injections', value: stats.injection_attempts, fill: '#ef4444' },
        { name: 'PII Found', value: stats.pii_detections, fill: '#eab308' },
        { name: 'Blocked', value: stats.blocked_count, fill: '#f97316' },
        { name: 'Flagged', value: stats.flagged_count, fill: '#8b5cf6' },
      ]
    : []

  // Simulated recent activity trend (placeholder for real time-series data)
  const trendData = stats ? [
    { time: '6h ago', threats: Math.round((stats.blocked_count || 0) * 0.1) },
    { time: '5h ago', threats: Math.round((stats.blocked_count || 0) * 0.15) },
    { time: '4h ago', threats: Math.round((stats.blocked_count || 0) * 0.2) },
    { time: '3h ago', threats: Math.round((stats.blocked_count || 0) * 0.12) },
    { time: '2h ago', threats: Math.round((stats.blocked_count || 0) * 0.25) },
    { time: '1h ago', threats: Math.round((stats.blocked_count || 0) * 0.18) },
  ] : []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center animate-pulse">
            <Shield className="w-5 h-5 text-brand-400" />
          </div>
          <p className="text-gray-500 text-sm">Loading security data...</p>
        </div>
      </div>
    )
  }

  const blockRate = stats
    ? ((stats.blocked_count / (stats.total_interactions || 1)) * 100).toFixed(1)
    : '0'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Security Overview</h1>
          <p className="text-gray-500 text-sm mt-1">
            Real-time AI gateway monitoring and threat intelligence
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/15">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
          </span>
          <span className="text-emerald-400 text-xs font-medium">Live</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Interactions"
          value={stats?.total_interactions ?? 0}
          subtitle="All time processed"
          icon={<Activity className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Threats Blocked"
          value={stats?.blocked_count ?? 0}
          subtitle={`${blockRate}% block rate`}
          icon={<ShieldOff className="w-5 h-5" />}
          color="red"
        />
        <StatCard
          title="Injection Attempts"
          value={stats?.injection_attempts ?? 0}
          subtitle="Prompt injections caught"
          icon={<Syringe className="w-5 h-5" />}
          color="orange"
        />
        <StatCard
          title="PII Detections"
          value={stats?.pii_detections ?? 0}
          subtitle="Sensitive data intercepted"
          icon={<Eye className="w-5 h-5" />}
          color="yellow"
        />
        <StatCard
          title="Flagged for Review"
          value={stats?.flagged_count ?? 0}
          subtitle="Requires attention"
          icon={<AlertTriangle className="w-5 h-5" />}
          color="purple"
        />
        <StatCard
          title="Avg Risk Score"
          value={`${((stats?.avg_risk_score ?? 0) * 100).toFixed(1)}%`}
          subtitle="Across all requests"
          icon={<TrendingUp className="w-5 h-5" />}
          color="green"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Distribution Donut */}
        <div className="glass rounded-2xl p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-white font-semibold text-sm">Risk Distribution</h3>
            <Zap className="w-4 h-4 text-brand-400/50" />
          </div>
          {riskPieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={riskPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {riskPieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={RISK_COLORS[entry.name.toLowerCase()] || '#6b7280'}
                      />
                    ))}
                  </Pie>
                  <Tooltip {...CHART_TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {Object.entries(RISK_COLORS).map(([level, color]) => {
                  const count = stats?.risk_distribution[level] ?? 0
                  return (
                    <div key={level} className="flex items-center gap-2 text-xs">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-gray-400 capitalize">{level}</span>
                      <span className="text-gray-500 ml-auto font-mono">{count}</span>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-60 text-gray-600 text-sm">
              No data yet
            </div>
          )}
        </div>

        {/* Threat Breakdown Bar */}
        <div className="glass rounded-2xl p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-white font-semibold text-sm">Threat Breakdown</h3>
            <ShieldOff className="w-4 h-4 text-red-400/50" />
          </div>
          {stats ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={threatBarData}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              >
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip {...CHART_TOOLTIP_STYLE} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                  {threatBarData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.fill} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-60 text-gray-600 text-sm">
              No data yet
            </div>
          )}
        </div>

        {/* Activity Trend */}
        <div className="glass rounded-2xl p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-white font-semibold text-sm">Threat Activity</h3>
            <Activity className="w-4 h-4 text-brand-400/50" />
          </div>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="threatGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="time"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip {...CHART_TOOLTIP_STYLE} />
                <Area
                  type="monotone"
                  dataKey="threats"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  fill="url(#threatGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-60 text-gray-600 text-sm">
              No data yet
            </div>
          )}
        </div>
      </div>

      {/* Security Score Banner */}
      <div className="glass rounded-2xl p-6 relative overflow-hidden animate-slide-up">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-500/[0.06] via-transparent to-purple-500/[0.06]" />
        <div className="relative flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold text-sm">Security Posture</h3>
            <p className="text-gray-500 text-xs mt-1">Overall gateway health score based on threat analysis</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-brand-400">
                {stats ? Math.max(0, 100 - Math.round((stats.avg_risk_score ?? 0) * 100)) : 0}
              </p>
              <p className="text-gray-500 text-[10px] uppercase tracking-wider mt-0.5">Score</p>
            </div>
            <div className="w-16 h-16 rounded-full border-[3px] border-brand-500/30 flex items-center justify-center relative">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(#0ea5e9 ${Math.max(0, 100 - Math.round((stats?.avg_risk_score ?? 0) * 100)) * 3.6}deg, transparent 0deg)`,
                  mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), black calc(100% - 3px))',
                  WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), black calc(100% - 3px))',
                }}
              />
              <Shield className="w-5 h-5 text-brand-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
