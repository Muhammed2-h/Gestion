import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { Mail, Lock, User, ArrowRight, TrendingUp, Shield, Globe, RefreshCw } from 'lucide-react'

export default function Auth() {
  const login = useAuthStore((s) => s.login)
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    if (attempts >= 5) {
      setError('Too many failed attempts. Please try again later.')
    }
  }, [attempts])

  useEffect(() => setMounted(true), [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password || (!isLogin && !name)) return
    if (attempts >= 5) return

    setLoading(true)
    setError('')

    // Simulate network delay
    await new Promise(r => setTimeout(r, 1000))

    if (isLogin && password !== 'password123') { // Mock check
      setAttempts(a => a + 1)
      setError('Invalid email or password.')
      setPassword('')
      setLoading(false)
      return
    }

    login(email, isLogin ? undefined : name)
    setLoading(false)
  }

  return (
    <div className="w-screen min-h-screen bg-[#0a0a0b] text-primary flex justify-center items-center py-5 relative overflow-x-hidden overflow-y-auto">
      <div className="relative z-10 w-full max-w-6xl min-h-[600px] p-10 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        
        {/* Left Side: Branding / Landing Info */}
        <div className={`flex flex-col justify-center ${mounted ? 'animate-fade-in' : ''}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center text-[1.4rem] font-black text-white">G</div>
            <h1 className="m-0 text-[2.5rem] font-black tracking-tight text-white">
              Gestion
            </h1>
          </div>
          <h2 className="text-[1.8rem] font-bold m-0 mb-4 leading-tight text-primary">
            Master your portfolio with next-gen intelligence.
          </h2>
          <p className="text-[1.05rem] text-secondary leading-relaxed max-w-[450px] m-0 mb-10">
            Unleash institutional-grade analytics, smart algorithmic trading, and real-time market insights tailored for individual investors.
          </p>

          <div className="flex flex-col gap-5">
            {[
              { icon: <TrendingUp size={20} className="text-accent" />, title: 'Real-time Analytics', desc: 'Live pricing, CAGR, and XIRR tracking.' },
              { icon: <Globe size={20} className="text-info" />, title: 'Deep Market Sectors', desc: 'Instant exposure analysis across 200+ equities.' },
              { icon: <Shield size={20} className="text-warning" />, title: 'Algorithmic Trading', desc: 'Configure powerful risk-managed strategies.' },
            ].map((f, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-bg-card border border-border flex items-center justify-center flex-shrink-0">
                  {f.icon}
                </div>
                <div>
                  <h4 className="m-0 mb-1 text-[0.95rem] font-bold text-primary">{f.title}</h4>
                  <p className="m-0 text-[0.85rem] text-secondary">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="flex justify-center items-center w-full">
          <div className={`w-full max-w-[420px] bg-bg-card border border-border rounded-2xl p-8 md:p-10 shadow-2xl ${mounted ? 'animate-fade-in' : ''}`}>
            <div className="mb-8 text-center">
              <h2 className="m-0 mb-2 text-[1.6rem] font-bold text-primary">
                {isLogin ? 'Welcome back' : 'Create an account'}
              </h2>
              <p className="m-0 text-[0.85rem] text-secondary">
                {isLogin ? 'Enter your credentials to access your terminal.' : 'Start dominating the markets today.'}
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3 px-3.5 bg-loss/10 border border-loss/20 rounded-xl flex items-center gap-2.5">
                <Shield size={16} className="text-loss" />
                <span className="text-[0.8rem] text-loss font-semibold">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {!isLogin && (
                <div className="form-group mb-0">
                  <label className="form-label text-xs font-semibold mb-1.5">Full Name</label>
                  <div className="relative flex items-center">
                    <User size={16} className="text-muted absolute left-3.5" />
                    <input
                      type="text"
                      className="form-input bg-bg-primary pl-10 h-11 border-border"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="form-group mb-0">
                <label className="form-label text-xs font-semibold mb-1.5">Email Address</label>
                <div className="relative flex items-center">
                  <Mail size={16} className="text-muted absolute left-3.5" />
                  <input
                    type="email"
                    className="form-input bg-bg-primary pl-10 h-11 border-border"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group mb-0">
                <label className="form-label text-xs font-semibold mb-1.5">Password</label>
                <div className="relative flex items-center">
                  <Lock size={16} className="text-muted absolute left-3.5" />
                  <input
                    type="password"
                    className="form-input bg-bg-primary pl-10 h-11 border-border"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {isLogin && (
                <div className="text-right -mt-1.5">
                  <button type="button" className="btn btn-ghost text-[0.75rem] text-accent p-0 hover:bg-transparent hover:underline">
                    Forgot password?
                  </button>
                </div>
              )}

              <button type="submit" className="btn btn-primary h-12 mt-2 justify-center font-bold text-base shadow-lg" disabled={loading || attempts >= 5}>
                {loading ? (
                  <><RefreshCw size={16} className="animate-spin" /> Verifying...</>
                ) : (
                  <>{isLogin ? 'Sign In' : 'Sign Up'} <ArrowRight size={16} /></>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-[0.85rem] text-secondary">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                className="btn btn-ghost text-accent p-0 font-bold border-b border-transparent hover:bg-transparent hover:underline"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
