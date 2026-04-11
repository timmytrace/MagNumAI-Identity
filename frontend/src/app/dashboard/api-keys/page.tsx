'use client'
import { useEffect, useState } from 'react'
import { apiKeysApi } from '@/lib/api'
import type { APIKey } from '@/types'
import { format } from 'date-fns'
import { Plus, Trash2, Copy, Check, Key } from 'lucide-react'

export default function APIKeysPage() {
  const [keys, setKeys] = useState<APIKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const fetchKeys = async () => {
    const res = await apiKeysApi.list()
    setKeys(res.data)
    setLoading(false)
  }

  useEffect(() => {
    fetchKeys()
  }, [])

  const handleCreate = async () => {
    if (!newKeyName.trim()) return
    setCreating(true)
    try {
      const res = await apiKeysApi.create(newKeyName)
      setNewKey(res.data.api_key)
      setNewKeyName('')
      await fetchKeys()
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
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
          <Key className="w-5 h-5 text-brand-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">API Keys</h1>
          <p className="text-gray-400 text-sm">Manage gateway access credentials</p>
        </div>
      </div>

      {/* New Key Alert */}
      {newKey && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
          <p className="text-emerald-400 font-medium text-sm mb-2">
            ✓ API key created — save it now, it won&apos;t be shown again
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-black/20 rounded-lg px-3 py-2 text-emerald-300 text-sm font-mono break-all">
              {newKey}
            </code>
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 shrink-0"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <button
            onClick={() => setNewKey(null)}
            className="mt-2 text-xs text-emerald-500 hover:text-emerald-400"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create Form */}
      <div className="glass rounded-xl p-4 flex gap-3">
        <input
          type="text"
          placeholder="Key name (e.g. Production App)"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          onClick={handleCreate}
          disabled={creating || !newKeyName.trim()}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          {creating ? 'Creating…' : 'Create Key'}
        </button>
      </div>

      {/* Keys Table */}
      <div className="glass rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Name</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Prefix</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Created</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Last Used</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-10 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-500 mx-auto" />
                </td>
              </tr>
            ) : keys.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-gray-500">No API keys yet</td>
              </tr>
            ) : (
              keys.map((key) => (
                <tr key={key.id} className="border-b border-white/5">
                  <td className="py-3 px-4 text-white font-medium">{key.name}</td>
                  <td className="py-3 px-4">
                    <code className="text-gray-400 text-xs bg-white/5 px-2 py-1 rounded">{key.key_prefix}…</code>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded-md ${key.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {key.is_active ? 'Active' : 'Revoked'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-400">
                    {format(new Date(key.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="py-3 px-4 text-gray-400">
                    {key.last_used_at ? format(new Date(key.last_used_at), 'MMM d, HH:mm') : 'Never'}
                  </td>
                  <td className="py-3 px-4">
                    {key.is_active && (
                      <button
                        onClick={() => handleRevoke(key.id)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
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
