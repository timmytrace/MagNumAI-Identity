'use client'
import { useEffect, useState } from 'react'
import { policiesApi } from '@/lib/api'
import type { SecurityPolicy } from '@/types'
import { Settings, Plus, Pencil } from 'lucide-react'
import { format } from 'date-fns'

const DEFAULT_RULES = {
  block_pii: true,
  block_secrets: true,
  block_injection: true,
  block_jailbreak: true,
  block_toxic: true,
  custom_terms: [] as string[],
  max_prompt_length: 10000,
}

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<SecurityPolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<SecurityPolicy | null>(null)
  const [form, setForm] = useState({ name: '', description: '', rules: DEFAULT_RULES, action: 'block' })
  const [customTermInput, setCustomTermInput] = useState('')

  const fetchPolicies = async () => {
    const res = await policiesApi.list()
    setPolicies(res.data)
    setLoading(false)
  }

  useEffect(() => {
    fetchPolicies()
  }, [])

  const handleSubmit = async () => {
    const payload = { ...form, rules: { ...form.rules, custom_terms: form.rules.custom_terms } }
    if (editingPolicy) {
      await policiesApi.update(editingPolicy.id, payload)
    } else {
      await policiesApi.create(payload)
    }
    setShowForm(false)
    setEditingPolicy(null)
    setForm({ name: '', description: '', rules: DEFAULT_RULES, action: 'block' })
    await fetchPolicies()
  }

  const openEdit = (policy: SecurityPolicy) => {
    setEditingPolicy(policy)
    setForm({
      name: policy.name,
      description: policy.description || '',
      rules: { ...DEFAULT_RULES, ...policy.rules },
      action: policy.action,
    })
    setShowForm(true)
  }

  const addCustomTerm = () => {
    if (customTermInput.trim()) {
      setForm((f) => ({
        ...f,
        rules: { ...f.rules, custom_terms: [...f.rules.custom_terms, customTermInput.trim()] },
      }))
      setCustomTermInput('')
    }
  }

  const removeCustomTerm = (term: string) => {
    setForm((f) => ({
      ...f,
      rules: { ...f.rules, custom_terms: f.rules.custom_terms.filter((t) => t !== term) },
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
            <Settings className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Security Policies</h1>
            <p className="text-gray-400 text-sm">Configure gateway security rules</p>
          </div>
        </div>
        <button
          onClick={() => { setEditingPolicy(null); setForm({ name: '', description: '', rules: DEFAULT_RULES, action: 'block' }); setShowForm(true) }}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Policy
        </button>
      </div>

      {/* Policies Grid */}
      <div className="grid gap-4">
        {loading ? (
          <div className="glass rounded-xl p-8 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-500 mx-auto" />
          </div>
        ) : policies.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center text-gray-500">
            No policies configured yet
          </div>
        ) : (
          policies.map((policy) => (
            <div key={policy.id} className="glass rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold">{policy.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-md ${policy.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {policy.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 capitalize">
                      {policy.action}
                    </span>
                  </div>
                  {policy.description && (
                    <p className="text-gray-400 text-sm mt-1">{policy.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {Object.entries(policy.rules)
                      .filter(([k, v]) => k.startsWith('block_') && v === true)
                      .map(([k]) => (
                        <span key={k} className="text-xs bg-brand-500/10 text-brand-400 px-2 py-0.5 rounded">
                          {k.replace('block_', '').replace('_', ' ')}
                        </span>
                      ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 shrink-0">
                  <span>{format(new Date(policy.updated_at), 'MMM d, yyyy')}</span>
                  <button
                    onClick={() => openEdit(policy)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Policy Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="glass rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-white font-semibold mb-4">
              {editingPolicy ? 'Edit Policy' : 'Create Policy'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Policy Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="e.g. Production Safety Policy"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Action on Violation</label>
                <select
                  value={form.action}
                  onChange={(e) => setForm((f) => ({ ...f, action: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="block">Block</option>
                  <option value="sanitize">Sanitize</option>
                  <option value="flag">Flag</option>
                  <option value="allow">Allow (log only)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Rules</label>
                <div className="space-y-2">
                  {[
                    ['block_pii', 'Block PII detection'],
                    ['block_secrets', 'Block secrets/credentials'],
                    ['block_injection', 'Block prompt injection'],
                    ['block_jailbreak', 'Block jailbreak attempts'],
                    ['block_toxic', 'Block toxic content'],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-3 text-sm text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.rules[key as keyof typeof form.rules] as boolean}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, rules: { ...f.rules, [key]: e.target.checked } }))
                        }
                        className="w-4 h-4 rounded accent-brand-500"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Max Prompt Length</label>
                <input
                  type="number"
                  value={form.rules.max_prompt_length}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, rules: { ...f.rules, max_prompt_length: +e.target.value } }))
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Custom Block Terms</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={customTermInput}
                    onChange={(e) => setCustomTermInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCustomTerm()}
                    placeholder="Add confidential term…"
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <button onClick={addCustomTerm} className="px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm rounded-lg">
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.rules.custom_terms.map((term) => (
                    <span key={term} className="flex items-center gap-1 text-xs bg-white/5 text-gray-300 px-2 py-1 rounded-md">
                      {term}
                      <button onClick={() => removeCustomTerm(term)} className="text-gray-500 hover:text-red-400">✕</button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowForm(false); setEditingPolicy(null) }}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!form.name.trim()}
                  className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                >
                  {editingPolicy ? 'Save Changes' : 'Create Policy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
