'use client'
import { useEffect, useState } from 'react'
import { logsApi } from '@/lib/api'
import type { StatsResponse } from '@/types'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'
import { Activity } from 'lucide-react'

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
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
          <Activity className="w-5 h-5 text-brand-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Risk Analytics</h1>
          <p className="text-gray-400 text-sm">Security posture and threat intelligence</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Distribution Bar */}
        <div className="glass rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Risk Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={riskBarData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="level" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: '8px' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}
                fill="#0ea5e9"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar Chart */}
        <div className="glass rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Threat Radar</h3>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#374151" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <PolarRadiusAxis tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <Radar name="Threats" dataKey="value" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Stats */}
        <div className="glass rounded-xl p-6 lg:col-span-2">
          <h3 className="text-white font-semibold mb-4">Platform Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Interactions', value: stats?.total_interactions ?? 0, color: 'text-blue-400' },
              { label: 'Block Rate', value: stats ? `${((stats.blocked_count / (stats.total_interactions || 1)) * 100).toFixed(1)}%` : '0%', color: 'text-red-400' },
              { label: 'Avg Risk Score', value: `${((stats?.avg_risk_score ?? 0) * 100).toFixed(1)}%`, color: 'text-yellow-400' },
              { label: 'PII Events', value: stats?.pii_detections ?? 0, color: 'text-orange-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white/5 rounded-lg p-4 text-center">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-gray-400 text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
