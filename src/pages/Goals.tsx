import { useState } from 'react'
import { Target, Plus, Calendar, Edit2, Trash2, X } from 'lucide-react'
import { formatCurrency, generateId } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'

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
    <div className="app-content animate-fade-in flex flex-col h-full overflow-auto">
      <PageHeader 
        title="Goals" 
        subtitle={`${goals.length} financial goal${goals.length !== 1 ? 's' : ''}`}
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => handleOpen()}><Plus size={14} /> New Goal</button>
        }
      />

      {goals.length === 0 && !showForm ? (
        <Card className="text-center p-10 max-w-2xl mx-auto mt-10 w-full">
          <div className="text-5xl mb-4">🎯</div>
          <h3 className="mb-2">No Goals Yet</h3>
          <p className="text-muted mb-6">Set financial targets — retirement, home, education, emergency fund.</p>
          <button className="btn btn-primary mx-auto inline-flex" onClick={() => handleOpen()}><Plus size={16} /> Add Your First Goal</button>
        </Card>
      ) : null}

      {goals.length > 0 && (
        <div className="grid grid-3 gap-5 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {goals.map((g) => {
            const pct = g.target_amount > 0 ? Math.min((g.current_amount / g.target_amount) * 100, 100) : 0
            const days = daysLeft(g.target_date)
            const urgent = days < 365 && days > 0
            const isCompleted = pct >= 100
            
            return (
              <Card key={g.id} className="flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-accent-dim flex items-center justify-center flex-shrink-0">
                      <Target size={20} className="text-accent" />
                    </div>
                    <div>
                      <div className="font-bold text-primary">{g.name}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Calendar size={12} className="text-muted" />
                        <span className={`text-xs ${urgent ? 'text-warning font-semibold' : 'text-muted'}`}>
                          {days > 0 ? `${days} days left` : 'Overdue!'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 text-muted hover:text-accent rounded-md hover:bg-bg-secondary transition-fast" onClick={() => handleOpen(g)}><Edit2 size={14} /></button>
                    <button className="p-1.5 text-muted hover:text-loss rounded-md hover:bg-loss-bg transition-fast" onClick={() => handleDelete(g.id)}><Trash2 size={14} /></button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-xs font-bold text-primary">{pct.toFixed(1)}%</span>
                    <span className="text-[0.65rem] text-muted">of {formatCurrency(g.target_amount, true)}</span>
                  </div>
                  <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{ 
                        width: `${pct}%`, 
                        background: isCompleted ? 'var(--color-profit)' : pct >= 50 ? 'var(--color-info)' : 'var(--color-warning)' 
                      }} 
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4 bg-bg-primary border border-border rounded-md p-3">
                  <div>
                    <div className="text-[0.65rem] text-muted uppercase tracking-wider mb-0.5">Saved</div>
                    <div className="font-mono font-bold text-accent text-sm">{formatCurrency(g.current_amount, true)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[0.65rem] text-muted uppercase tracking-wider mb-0.5">Needed</div>
                    <div className={`font-mono font-bold text-sm ${isCompleted ? 'text-muted line-through' : 'text-primary'}`}>
                      {formatCurrency(Math.max(g.target_amount - g.current_amount, 0), true)}
                    </div>
                  </div>
                </div>

                {g.note && <div className="text-xs text-muted italic mb-4">{g.note}</div>}

                <div className="flex gap-2 mt-auto">
                  <button 
                    className="btn btn-outline btn-sm flex-1 disabled:opacity-50" 
                    onClick={() => handleUpdateAmount(g.id, -10000)}
                    disabled={g.current_amount <= 0}
                  >
                    − ₹10K
                  </button>
                  <button 
                    className="btn btn-primary btn-sm flex-1 disabled:opacity-50" 
                    onClick={() => handleUpdateAmount(g.id, 10000)}
                    disabled={isCompleted}
                  >
                    + ₹10K
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-bg-card border border-border-light rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button 
              className="absolute top-4 right-4 p-1.5 text-muted hover:text-primary rounded-md hover:bg-bg-secondary transition-fast"
              onClick={() => setShowForm(false)}
            >
              <X size={18} />
            </button>
            <h3 className="mb-6 pr-8">{editId ? 'Edit Goal' : 'New Financial Goal'}</h3>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="form-group mb-0">
                <label className="form-label text-xs font-semibold mb-1">Goal Name *</label>
                <input className="form-input bg-bg-primary text-sm p-2 rounded-md border border-border w-full" placeholder="e.g. Retirement Corpus" value={form.name} onChange={(e) => set({ name: e.target.value })} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group mb-0">
                  <label className="form-label text-xs font-semibold mb-1">Target Amount (₹) *</label>
                  <input className="form-input bg-bg-primary text-sm p-2 rounded-md border border-border w-full" type="number" min="1" step="any" placeholder="e.g. 5000000" value={form.target_amount} onChange={(e) => set({ target_amount: e.target.value })} />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-xs font-semibold mb-1">Already Saved (₹)</label>
                  <input className="form-input bg-bg-primary text-sm p-2 rounded-md border border-border w-full" type="number" min="0" step="any" placeholder="0" value={form.current_amount} onChange={(e) => set({ current_amount: e.target.value })} />
                </div>
              </div>
              <div className="form-group mb-0">
                <label className="form-label text-xs font-semibold mb-1">Target Date *</label>
                <input className="form-input bg-bg-primary text-sm p-2 rounded-md border border-border w-full" type="date" value={form.target_date} onChange={(e) => set({ target_date: e.target.value })} />
              </div>
              <div className="form-group mb-0">
                <label className="form-label text-xs font-semibold mb-1">Notes (optional)</label>
                <input className="form-input bg-bg-primary text-sm p-2 rounded-md border border-border w-full" placeholder="e.g. Monthly SIP of ₹25,000" value={form.note} onChange={(e) => set({ note: e.target.value })} />
              </div>
              {error && <span className="text-xs text-loss font-semibold">{error}</span>}
              <div className="flex gap-3 mt-4">
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
