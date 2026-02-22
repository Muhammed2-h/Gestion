import { useState } from 'react'
import { Target, Plus, Calendar, Edit2, Trash2 } from 'lucide-react'
import { formatCurrency, generateId } from '@/lib/utils'

interface Goal {
  id: string
  name: string
  target_amount: number
  current_amount: number
  target_date: string
  note?: string
}

const STORAGE_KEY = 'gestion-goals'

function loadGoals(): Goal[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
}
function saveGoals(goals: Goal[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals))
}

function daysLeft(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

const defaultForm = { name: '', target_amount: '', current_amount: '', target_date: '', note: '' }

export default function Goals() {
  const [goals, setGoals]     = useState<Goal[]>(loadGoals)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId]   = useState<string | null>(null)
  const [form, setForm]       = useState(defaultForm)
  const [error, setError]     = useState('')

  function set(patch: Partial<typeof form>) { setForm((f) => ({ ...f, ...patch })); setError('') }

  function handleOpen(goal?: Goal) {
    if (goal) {
      setEditId(goal.id)
      setForm({ name: goal.name, target_amount: String(goal.target_amount), current_amount: String(goal.current_amount), target_date: goal.target_date, note: goal.note ?? '' })
    } else {
      setEditId(null)
      setForm(defaultForm)
    }
    setShowForm(true)
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Goal name is required'); return }
    if (!form.target_amount || parseFloat(form.target_amount) <= 0) { setError('Enter a target amount'); return }
    if (!form.target_date) { setError('Target date is required'); return }

    const updated: Goal = {
      id: editId ?? generateId(),
      name: form.name.trim(),
      target_amount: parseFloat(form.target_amount),
      current_amount: parseFloat(form.current_amount) || 0,
      target_date: form.target_date,
      note: form.note,
    }

    const next = editId ? goals.map((g) => (g.id === editId ? updated : g)) : [...goals, updated]
    setGoals(next)
    saveGoals(next)
    setShowForm(false)
  }

  function handleDelete(id: string) {
    const next = goals.filter((g) => g.id !== id)
    setGoals(next)
    saveGoals(next)
  }

  function handleUpdateAmount(id: string, delta: number) {
    const next = goals.map((g) => {
      if (g.id !== id) return g
      const updated = { ...g, current_amount: Math.max(0, g.current_amount + delta) }
      return updated
    })
    setGoals(next)
    saveGoals(next)
  }

  return (
    <div className="app-content animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Goals</h1>
          <p className="page-subtitle">{goals.length} financial goal{goals.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary btn-sm" onClick={() => handleOpen()}><Plus size={14} /> New Goal</button>
        </div>
      </div>

      {goals.length === 0 && !showForm ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🎯</div>
          <h3 style={{ marginBottom: 8 }}>No Goals Yet</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Set financial targets — retirement, home, education, emergency fund.</p>
          <button className="btn btn-primary" onClick={() => handleOpen()}><Plus size={16} /> Add Your First Goal</button>
        </div>
      ) : null}

      {goals.length > 0 && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20, marginBottom: 24 }}>
          {goals.map((g) => {
            const pct = g.target_amount > 0 ? Math.min((g.current_amount / g.target_amount) * 100, 100) : 0
            const days = daysLeft(g.target_date)
            const urgent = days < 365 && days > 0
            return (
              <div key={g.id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-lg)', background: 'var(--color-accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Target size={18} color="var(--color-accent)" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{g.name}</div>
                      <div className="flex items-center gap-1" style={{ marginTop: 2 }}>
                        <Calendar size={11} color="var(--text-muted)" />
                        <span style={{ fontSize: '0.7rem', color: urgent ? 'var(--color-warning)' : 'var(--text-muted)' }}>
                          {days > 0 ? `${days} days left` : 'Overdue!'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button className="btn btn-ghost btn-icon" style={{ padding: 4 }} onClick={() => handleOpen(g)}><Edit2 size={13} /></button>
                    <button className="btn btn-ghost btn-icon" style={{ padding: 4, color: 'var(--color-loss)' }} onClick={() => handleDelete(g.id)}><Trash2 size={13} /></button>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 999, marginBottom: 12, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: pct >= 100 ? 'linear-gradient(90deg, var(--color-profit), #34d399)' : pct >= 50 ? 'linear-gradient(90deg, var(--color-info), #60a5fa)' : 'linear-gradient(90deg, var(--color-warning), #fbbf24)', transition: 'width 0.4s ease' }} />
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Saved</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-accent)' }}>{formatCurrency(g.current_amount, true)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Target</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(g.target_amount, true)}</div>
                  </div>
                </div>

                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                  Still needed: <span style={{ color: 'var(--color-loss)', fontWeight: 600 }}>{formatCurrency(Math.max(g.target_amount - g.current_amount, 0), true)}</span>
                  {' · '}{pct.toFixed(1)}% complete
                </div>

                {g.note && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 10 }}>{g.note}</div>}

                <div className="flex gap-2">
                  <button className="btn btn-outline btn-sm flex-1" onClick={() => handleUpdateAmount(g.id, -10000)}>− ₹10K</button>
                  <button className="btn btn-primary btn-sm flex-1" onClick={() => handleUpdateAmount(g.id, 10000)}>+ ₹10K</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border-light)', borderRadius: 'var(--radius-2xl)', padding: '28px 32px', width: '100%', maxWidth: 480, boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}>
            <h3 style={{ marginBottom: 20 }}>{editId ? 'Edit Goal' : 'New Financial Goal'}</h3>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Goal Name *</label>
                <input className="form-input" placeholder="e.g. Retirement Corpus" value={form.name} onChange={(e) => set({ name: e.target.value })} autoFocus />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Target Amount (₹) *</label>
                  <input className="form-input" type="number" min="1" step="any" placeholder="e.g. 5000000" value={form.target_amount} onChange={(e) => set({ target_amount: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Already Saved (₹)</label>
                  <input className="form-input" type="number" min="0" step="any" placeholder="0" value={form.current_amount} onChange={(e) => set({ current_amount: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Target Date *</label>
                <input className="form-input" type="date" value={form.target_date} onChange={(e) => set({ target_date: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Notes (optional)</label>
                <input className="form-input" placeholder="e.g. Monthly SIP of ₹25,000" value={form.note} onChange={(e) => set({ note: e.target.value })} />
              </div>
              {error && <span style={{ fontSize: '0.75rem', color: 'var(--color-loss)' }}>{error}</span>}
              <div className="flex gap-2 mt-2">
                <button type="button" className="btn btn-outline flex-1" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary flex-1">{editId ? 'Save Changes' : 'Create Goal'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
