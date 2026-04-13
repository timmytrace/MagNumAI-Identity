'use client'
import { useEffect, useState } from 'react'
import { apiKeysApi } from '@/lib/api'
import type { APIKey } from '@/types'
import { format } from 'date-fns'
import { Plus, Trash2, Copy, Check, Key, X } from 'lucide-react'

export default function APIKeysPage() {
  const [keys, setKeys] = useState<APIKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchKeys = async () => {
    try {
      const res = await apiKeysApi.list()
      setKeys(res.data)
    } catch {
      setError('Failed to load API keys. Please refresh or re-login.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchKeys()
  }, [])

  const handleCreate = async () => {
    if (!newKeyName.trim()) return
    setCreating(true)
    setError(null)
    try {
      const res = await apiKeysApi.create(newKeyName)
      setNewKey(res.data.api_key)
      setNewKeyName('')
      await fetchKeys()
    } catch {
      setError('Failed to create API key. Check your session or try again.')
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (id: string) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return
    await apiKeysApi.revoke(id)
    await fetchKeys()
  }

  const handleCopy = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-400/20 to-brand-600/20 border border-brand-500/15 flex items-center justify-center">
          <Key className="w-5 h-5 text-brand-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">API Keys</h1>
          <p className="text-gray-500 text-sm">Manage gateway access credentials</p>
        </div>
      </div>

      {/* New Key Alert */}
      {newKey && (
        <div className="bg-emerald-500/[0.08] border border-emerald-500/20 rounded-2xl p-5 animate-slide-up">
          <p className="text-emerald-400 font-semibold text-[13px] mb-3">
            API key created — save it now, it won&apos;t be shown again
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-black/30 rounded-xl px-4 py-2.5 text-emerald-300 text-[13px] font-mono break-all border border-emerald-500/10">
              {newKey}
            </code>
            <button
              onClick={handleCopy}
              title="Copy API key"
              className="w-10 h-10 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0 transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <button
            onClick={() => setNewKey(null)}
            title="Dismiss alert"
            className="mt-3 text-xs text-emerald-500 hover:text-emerald-400 transition-colors font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/[0.08] border border-red-500/20 rounded-2xl px-5 py-4 flex items-center justify-between animate-slide-up">
          <p className="text-red-400 text-[13px] font-medium">{error}</p>
          <button onClick={() => setError(null)} aria-label="Dismiss error" className="text-red-400/60 hover:text-red-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Create Form */}
      <div className="glass rounded-2xl p-5 flex gap-3 border border-white/[0.06]">
        <input
          type="text"
          placeholder="Key name (e.g. Production App)"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[13px] text-white placeholder-gray-600 focus:outline-none focus:border-brand-500/40 focus:ring-1 focus:ring-brand-500/20 transition-colors"
        />
        <button
          onClick={handleCreate}
          disabled={creating || !newKeyName.trim()}
          title="Create new API key"
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-[13px] font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-lg shadow-brand-600/20"
        >
          <Plus className="w-4 h-4" />
          {creating ? 'Creating…' : 'Create Key'}
        </button>
      </div>

      {/* Keys Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left py-3.5 px-5 text-gray-500 font-semibold text-[11px] uppercase tracking-wider">Name</th>
              <th className="text-left py-3.5 px-5 text-gray-500 font-semibold text-[11px] uppercase tracking-wider">Prefix</th>
              <th className="text-left py-3.5 px-5 text-gray-500 font-semibold text-[11px] uppercase tracking-wider">Status</th>
              <th className="text-left py-3.5 px-5 text-gray-500 font-semibold text-[11px] uppercase tracking-wider">Created</th>
              <th className="text-left py-3.5 px-5 text-gray-500 font-semibold text-[11px] uppercase tracking-wider">Last Used</th>
              <th className="text-left py-3.5 px-5 text-gray-500 font-semibold text-[11px] uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand-500/30 border-t-brand-500" />
                    <span className="text-gray-500 text-xs">Loading keys...</span>
                  </div>
                </td>
              </tr>
            ) : keys.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
                      <Key className="w-5 h-5 text-brand-400" />
                    </div>
                    <span className="text-gray-500 text-sm">No API keys yet</span>
                  </div>
                </td>
              </tr>
            ) : (
              keys.map((key) => (
                <tr key={key.id} className="border-b border-white/[0.04] table-row-hover">
                  <td className="py-3.5 px-5 text-white font-medium">{key.name}</td>
                  <td className="py-3.5 px-5">
                    <code className="text-gray-400 text-xs bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.06] font-mono">{key.key_prefix}…</code>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider ${key.is_active ? 'bg-emerald-500/12 text-emerald-400 border border-emerald-500/15' : 'bg-gray-500/12 text-gray-400 border border-gray-500/15'}`}>
                      {key.is_active ? 'Active' : 'Revoked'}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-gray-500 font-mono text-xs">
                    {format(new Date(key.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="py-3.5 px-5 text-gray-500 font-mono text-xs">
                    {key.last_used_at ? format(new Date(key.last_used_at), 'MMM d, HH:mm') : '—'}
                  </td>
                  <td className="py-3.5 px-5">
                    {key.is_active && (
                      <button
                        onClick={() => handleRevoke(key.id)}
                        aria-label={`Revoke API key ${key.name}`}
                        className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-red-500/10 flex items-center justify-center text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
