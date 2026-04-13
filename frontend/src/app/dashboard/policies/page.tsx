'use client'
import { useEffect, useState } from 'react'
import { policiesApi } from '@/lib/api'
import type { SecurityPolicy } from '@/types'
import { Settings, Plus, Pencil, X } from 'lucide-react'
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-400/20 to-brand-600/20 border border-brand-500/15 flex items-center justify-center">
            <Settings className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Security Policies</h1>
            <p className="text-gray-500 text-sm">Configure gateway security rules</p>
          </div>
        </div>
        <button
          onClick={() => { setEditingPolicy(null); setForm({ name: '', description: '', rules: DEFAULT_RULES, action: 'block' }); setShowForm(true) }}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-[13px] font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-brand-600/20"
        >
          <Plus className="w-4 h-4" />
          New Policy
        </button>
      </div>

      {/* Policies Grid */}
      <div className="grid gap-4">
        {loading ? (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand-500/30 border-t-brand-500" />
              <span className="text-gray-500 text-xs">Loading policies...</span>
            </div>
          </div>
        ) : policies.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center">
                <Settings className="w-6 h-6 text-brand-400" />
              </div>
              <span className="text-gray-500 text-sm">No policies configured yet</span>
            </div>
          </div>
        ) : (
          policies.map((policy, i) => (
            <div key={policy.id} className="glass rounded-2xl p-5 border border-white/[0.06] hover:border-white/[0.1] transition-all animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-white font-semibold">{policy.name}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider ${policy.is_active ? 'bg-emerald-500/12 text-emerald-400 border border-emerald-500/15' : 'bg-gray-500/12 text-gray-400 border border-gray-500/15'}`}>
                      {policy.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider bg-blue-500/12 text-blue-400 border border-blue-500/15 capitalize">
                      {policy.action}
                    </span>
                  </div>
                  {policy.description && (
                    <p className="text-gray-500 text-[13px] mt-1.5">{policy.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {Object.entries(policy.rules)
                      .filter(([k, v]) => k.startsWith('block_') && v === true)
                      .map(([k]) => (
                        <span key={k} className="text-[10px] bg-brand-500/10 text-brand-400 px-2.5 py-0.5 rounded-md border border-brand-500/15 font-medium">
                          {k.replace('block_', '').replace('_', ' ')}
                        </span>
                      ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-gray-600 font-mono">{format(new Date(policy.updated_at), 'MMM d, yyyy')}</span>
                  <button
                    onClick={() => openEdit(policy)}
                    title="Edit policy"
                    className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Policy Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto animate-slide-up border border-white/[0.08]">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-500/15 flex items-center justify-center">
                  <Settings className="w-4 h-4 text-brand-400" />
                </div>
                <h3 className="text-white font-semibold">
                  {editingPolicy ? 'Edit Policy' : 'Create Policy'}
                </h3>
              </div>
              <button onClick={() => { setShowForm(false); setEditingPolicy(null) }} className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Policy Name</label>
                <input
                  type="text"
                  title="Policy Name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[13px] text-white placeholder-gray-600 focus:outline-none focus:border-brand-500/40 focus:ring-1 focus:ring-brand-500/20 transition-colors"
                  placeholder="e.g. Production Safety Policy"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  title="Description"
                  placeholder="Describe the policy and its purpose"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[13px] text-white placeholder-gray-600 focus:outline-none focus:border-brand-500/40 focus:ring-1 focus:ring-brand-500/20 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Action on Violation</label>
                <select
                  title="Action on Violation"
                  value={form.action}
                  onChange={(e) => setForm((f) => ({ ...f, action: e.target.value }))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[13px] text-gray-300 focus:outline-none focus:border-brand-500/40 focus:ring-1 focus:ring-brand-500/20 transition-colors"
                >
                  <option value="block">Block</option>
                  <option value="sanitize">Sanitize</option>
                  <option value="flag">Flag</option>
                  <option value="allow">Allow (log only)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-2">Rules</label>
                <div className="space-y-2.5 bg-white/[0.02] rounded-xl p-4 border border-white/[0.04]">
                  {[
                    ['block_pii', 'Block PII detection'],
                    ['block_secrets', 'Block secrets/credentials'],
                    ['block_injection', 'Block prompt injection'],
                    ['block_jailbreak', 'Block jailbreak attempts'],
                    ['block_toxic', 'Block toxic content'],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-3 text-[13px] text-gray-300 cursor-pointer hover:text-white transition-colors">
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
                <label className="block text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Max Prompt Length</label>
                <input
                  type="number"
                  title="Max Prompt Length"
                  placeholder="Enter maximum prompt length"
                  value={form.rules.max_prompt_length}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, rules: { ...f.rules, max_prompt_length: +e.target.value } }))
                  }
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[13px] text-white focus:outline-none focus:border-brand-500/40 focus:ring-1 focus:ring-brand-500/20 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Custom Block Terms</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    title="Custom Block Terms"
                    value={customTermInput}
                    onChange={(e) => setCustomTermInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCustomTerm()}
                    placeholder="Add confidential term…"
                    className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[13px] text-white placeholder-gray-600 focus:outline-none focus:border-brand-500/40 focus:ring-1 focus:ring-brand-500/20 transition-colors"
                  />
                  <button onClick={addCustomTerm} className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-[13px] font-semibold rounded-xl transition-colors">
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.rules.custom_terms.map((term) => (
                    <span key={term} className="flex items-center gap-1.5 text-[11px] bg-white/[0.04] text-gray-300 px-2.5 py-1 rounded-lg border border-white/[0.06]">
                      {term}
                      <button onClick={() => removeCustomTerm(term)} className="text-gray-500 hover:text-red-400 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowForm(false); setEditingPolicy(null) }}
                  className="flex-1 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-gray-300 text-[13px] font-semibold py-2.5 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!form.name.trim()}
                  className="flex-1 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-[13px] font-semibold py-2.5 rounded-xl transition-colors shadow-lg shadow-brand-600/20"
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
