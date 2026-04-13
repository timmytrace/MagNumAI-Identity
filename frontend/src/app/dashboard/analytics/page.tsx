'use client'
import { useEffect, useState } from 'react'
import { logsApi } from '@/lib/api'
import type { StatsResponse } from '@/types'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'
import { Activity, Shield, ShieldOff, Eye, Syringe } from 'lucide-react'

const CHART_TOOLTIP = {
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

export default function AnalyticsPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    logsApi.stats().then((res) => {
      setStats(res.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const radarData = stats
    ? [
        { subject: 'Injections', value: stats.injection_attempts, fullMark: stats.total_interactions || 1 },
        { subject: 'PII', value: stats.pii_detections, fullMark: stats.total_interactions || 1 },
        { subject: 'Blocked', value: stats.blocked_count, fullMark: stats.total_interactions || 1 },
        { subject: 'Flagged', value: stats.flagged_count, fullMark: stats.total_interactions || 1 },
      ]
    : []

  const riskBarData = stats
    ? Object.entries(stats.risk_distribution).map(([level, count]) => ({
        level: level.charAt(0).toUpperCase() + level.slice(1),
        count,
        fill: level === 'critical' ? '#ef4444' : level === 'high' ? '#f97316' : level === 'medium' ? '#eab308' : '#22c55e',
      }))
    : []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center animate-pulse">
            <Activity className="w-5 h-5 text-brand-400" />
          </div>
          <p className="text-gray-500 text-sm">Loading analytics...</p>
        </div>
      </div>
    )
  }

  const blockRate = stats ? ((stats.blocked_count / (stats.total_interactions || 1)) * 100).toFixed(1) : '0'
  const avgRisk = ((stats?.avg_risk_score ?? 0) * 100).toFixed(1)

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-400/20 to-brand-600/20 border border-brand-500/15 flex items-center justify-center">
          <Activity className="w-5 h-5 text-brand-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Risk Analytics</h1>
          <p className="text-gray-500 text-sm">Security posture and threat intelligence</p>
        </div>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Interactions', value: stats?.total_interactions ?? 0, icon: Activity, color: 'text-brand-400', bg: 'bg-brand-500/10 border-brand-500/15', card: 'stat-card stat-card-blue' },
          { label: 'Block Rate', value: `${blockRate}%`, icon: ShieldOff, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/15', card: 'stat-card stat-card-red' },
          { label: 'Avg Risk Score', value: `${avgRisk}%`, icon: Shield, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/15', card: 'stat-card stat-card-yellow' },
          { label: 'PII Events', value: stats?.pii_detections ?? 0, icon: Eye, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/15', card: 'stat-card stat-card-orange' },
        ].map(({ label, value, icon: Icon, color, bg, card }) => (
          <div key={label} className={`${card} animate-slide-up`}>
            <div className="flex items-center gap-3 pl-3">
              <div className={`w-10 h-10 rounded-xl ${bg} border flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-gray-500 text-xs mt-0.5">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Distribution Bar */}
        <div className="glass rounded-2xl p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-white font-semibold text-sm">Risk Distribution</h3>
            <Syringe className="w-4 h-4 text-brand-400/40" />
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={riskBarData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="level"
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip {...CHART_TOOLTIP} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={48}>
                {riskBarData.map((entry, idx) => (
                  <Bar key={idx} dataKey="count" fill={entry.fill} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar Chart */}
        <div className="glass rounded-2xl p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-white font-semibold text-sm">Threat Radar</h3>
            <Shield className="w-4 h-4 text-brand-400/40" />
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.06)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11 }} />
              <PolarRadiusAxis tick={{ fill: '#64748b', fontSize: 10 }} />
              <Radar
                name="Threats"
                dataKey="value"
                stroke="#0ea5e9"
                fill="#0ea5e9"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
