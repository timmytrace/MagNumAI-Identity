'use client'
import { useEffect, useState } from 'react'
import { logsApi } from '@/lib/api'
import type { LogEntry, LogsResponse } from '@/types'
import Badge from '@/components/ui/Badge'
import { format } from 'date-fns'
import { ShieldOff } from 'lucide-react'

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
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
          <ShieldOff className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Blocked Requests</h1>
          <p className="text-gray-400 text-sm">Requests stopped by the security gateway</p>
        </div>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Time</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Prompt</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Risk Level</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Detections</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500 mx-auto" />
                  </td>
                </tr>
              ) : data?.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    No blocked requests — system is clean ✓
                  </td>
                </tr>
              ) : (
                data?.items.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                    onClick={() => setSelected(log)}
                  >
                    <td className="py-3 px-4 text-gray-400 whitespace-nowrap">
                      {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                    </td>
                    <td className="py-3 px-4 text-gray-300 max-w-xs truncate">
                      {log.prompt.substring(0, 80)}{log.prompt.length > 80 ? '…' : ''}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={log.risk_level as 'low' | 'medium' | 'high' | 'critical'}>
                        {log.risk_level}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1 flex-wrap">
                        {log.prompt_injection_detected && (
                          <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">injection</span>
                        )}
                        {log.jailbreak_detected && (
                          <span className="text-xs bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">jailbreak</span>
                        )}
                        {log.toxic_content_detected && (
                          <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">toxic</span>
                        )}
                        {log.pii_detected_input && (
                          <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">pii</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-red-400 font-medium">
                      {(log.input_risk_score * 100).toFixed(0)}%
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
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="glass rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-white font-semibold">Blocked Request Detail</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-gray-400 mb-1">Blocked Prompt</p>
                <p className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-gray-200 whitespace-pre-wrap">
                  {selected.prompt}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-gray-400 text-xs">Risk Score</p>
                  <p className="text-red-400 font-bold text-lg mt-1">
                    {(selected.input_risk_score * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-gray-400 text-xs">Risk Level</p>
                  <Badge variant={selected.risk_level} className="mt-1">{selected.risk_level}</Badge>
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-gray-400 text-xs mb-2">Detected Threats</p>
                <div className="flex flex-wrap gap-2">
                  {selected.prompt_injection_detected && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-md">Prompt Injection</span>}
                  {selected.jailbreak_detected && <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-md">Jailbreak Attempt</span>}
                  {selected.toxic_content_detected && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-md">Toxic Content</span>}
                  {selected.pii_detected_input && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-md">PII Detected</span>}
                  {selected.secrets_detected && <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded-md">Secrets Detected</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
