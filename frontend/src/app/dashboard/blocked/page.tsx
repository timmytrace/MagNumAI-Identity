'use client'
import { useEffect, useState } from 'react'
import { logsApi } from '@/lib/api'
import type { LogEntry, LogsResponse } from '@/types'
import Badge from '@/components/ui/Badge'
import { format } from 'date-fns'
import { ShieldOff, X, AlertTriangle } from 'lucide-react'

export default function BlockedPage() {
  const [data, setData] = useState<LogsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<LogEntry | null>(null)

  useEffect(() => {
    logsApi.list({ status: 'blocked', page_size: 50 }).then((res) => {
      setData(res.data)
      setLoading(false)
    })
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-400/20 to-red-600/20 border border-red-500/15 flex items-center justify-center">
            <ShieldOff className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Blocked Requests</h1>
            <p className="text-gray-500 text-sm">Requests stopped by the security gateway</p>
          </div>
        </div>
        {data && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/[0.08] border border-red-500/15">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-red-400 text-xs font-mono font-medium">{data.total} blocked</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left py-3.5 px-5 text-gray-500 font-semibold text-[11px] uppercase tracking-wider">Time</th>
                <th className="text-left py-3.5 px-5 text-gray-500 font-semibold text-[11px] uppercase tracking-wider">Prompt</th>
                <th className="text-left py-3.5 px-5 text-gray-500 font-semibold text-[11px] uppercase tracking-wider">Risk Level</th>
                <th className="text-left py-3.5 px-5 text-gray-500 font-semibold text-[11px] uppercase tracking-wider">Detections</th>
                <th className="text-left py-3.5 px-5 text-gray-500 font-semibold text-[11px] uppercase tracking-wider">Score</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-red-500/30 border-t-red-500" />
                      <span className="text-gray-500 text-xs">Loading blocked requests...</span>
                    </div>
                  </td>
                </tr>
              ) : data?.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                        <ShieldOff className="w-5 h-5 text-emerald-400" />
                      </div>
                      <span className="text-gray-500 text-sm">No blocked requests — system is clean</span>
                    </div>
                  </td>
                </tr>
              ) : (
                data?.items.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-white/[0.04] table-row-hover"
                    onClick={() => setSelected(log)}
                  >
                    <td className="py-3.5 px-5 text-gray-500 whitespace-nowrap font-mono text-xs">
                      {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                    </td>
                    <td className="py-3.5 px-5 text-gray-300 max-w-xs truncate">
                      {log.prompt.substring(0, 80)}{log.prompt.length > 80 ? '…' : ''}
                    </td>
                    <td className="py-3.5 px-5">
                      <Badge variant={log.risk_level as 'low' | 'medium' | 'high' | 'critical'}>
                        {log.risk_level}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex gap-1 flex-wrap">
                        {log.prompt_injection_detected && (
                          <span className="text-[10px] bg-red-500/12 text-red-400 px-2 py-0.5 rounded-md border border-red-500/15 font-medium">injection</span>
                        )}
                        {log.jailbreak_detected && (
                          <span className="text-[10px] bg-purple-500/12 text-purple-400 px-2 py-0.5 rounded-md border border-purple-500/15 font-medium">jailbreak</span>
                        )}
                        {log.toxic_content_detected && (
                          <span className="text-[10px] bg-red-500/12 text-red-400 px-2 py-0.5 rounded-md border border-red-500/15 font-medium">toxic</span>
                        )}
                        {log.pii_detected_input && (
                          <span className="text-[10px] bg-yellow-500/12 text-yellow-400 px-2 py-0.5 rounded-md border border-yellow-500/15 font-medium">pii</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="font-mono font-semibold text-xs text-red-400">
                        {(log.input_risk_score * 100).toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelected(null)}
        >
          <div
            className="glass rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto animate-slide-up border border-white/[0.08]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
                  <ShieldOff className="w-4 h-4 text-red-400" />
                </div>
                <h3 className="text-white font-semibold">Blocked Request Detail</h3>
              </div>
              <button aria-label="Close detail panel" onClick={() => setSelected(null)} className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Blocked Prompt</p>
                <p className="bg-red-500/[0.06] border border-red-500/15 rounded-xl p-4 text-gray-200 whitespace-pre-wrap text-[13px] leading-relaxed">
                  {selected.prompt}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5">
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold">Risk Score</p>
                  <p className="text-red-400 font-bold text-lg mt-1 font-mono">
                    {(selected.input_risk_score * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5">
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold mb-1.5">Risk Level</p>
                  <Badge variant={selected.risk_level}>{selected.risk_level}</Badge>
                </div>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5">
                <p className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold mb-2.5">Detected Threats</p>
                <div className="flex flex-wrap gap-2">
                  {selected.prompt_injection_detected && <span className="text-[11px] bg-red-500/12 text-red-400 px-2.5 py-1 rounded-lg border border-red-500/15 font-medium">Prompt Injection</span>}
                  {selected.jailbreak_detected && <span className="text-[11px] bg-purple-500/12 text-purple-400 px-2.5 py-1 rounded-lg border border-purple-500/15 font-medium">Jailbreak Attempt</span>}
                  {selected.toxic_content_detected && <span className="text-[11px] bg-red-500/12 text-red-400 px-2.5 py-1 rounded-lg border border-red-500/15 font-medium">Toxic Content</span>}
                  {selected.pii_detected_input && <span className="text-[11px] bg-yellow-500/12 text-yellow-400 px-2.5 py-1 rounded-lg border border-yellow-500/15 font-medium">PII Detected</span>}
                  {selected.secrets_detected && <span className="text-[11px] bg-orange-500/12 text-orange-400 px-2.5 py-1 rounded-lg border border-orange-500/15 font-medium">Secrets Detected</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
