import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { Mail, Lock, User, ArrowRight, TrendingUp, Shield, Globe, RefreshCw } from 'lucide-react'
import { Card } from '@/components/ui/Card'

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
    <div className="w-screen min-h-screen bg-bg-primary text-primary flex justify-center items-center py-5 relative overflow-x-hidden overflow-y-auto">
      <div className="relative z-10 w-full max-w-6xl min-h-[600px] p-10 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        
        {/* Left Side: Branding / Landing Info */}
        <div className={`flex flex-col justify-center max-w-md mx-auto ${mounted ? 'animate-fade-in' : ''}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center text-xl font-black text-white">G</div>
            <h1 className="m-0 text-3xl font-black tracking-tight text-white">
              Gestion
            </h1>
          </div>
          <h2 className="text-2xl font-bold m-0 mb-4 leading-tight text-primary">
            Master your portfolio with next-gen intelligence.
          </h2>
          <p className="text-base text-secondary leading-relaxed mb-10">
            Unleash institutional-grade analytics, smart algorithmic trading, and real-time market insights tailored for individual investors.
          </p>

          <div className="flex flex-col gap-6">
            {[
              { icon: <TrendingUp size={18} className="text-accent" />, title: 'Real-time Analytics', desc: 'Live pricing, CAGR, and XIRR tracking.' },
              { icon: <Globe size={18} className="text-info" />, title: 'Deep Market Sectors', desc: 'Instant exposure analysis across 200+ equities.' },
              { icon: <Shield size={18} className="text-warning" />, title: 'Algorithmic Trading', desc: 'Configure powerful risk-managed strategies.' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-bg-secondary border border-border/50 flex items-center justify-center flex-shrink-0">
                  {f.icon}
                </div>
                <div>
                  <h4 className="m-0 mb-0.5 text-sm font-bold text-primary">{f.title}</h4>
                  <p className="m-0 text-xs text-secondary">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="flex justify-center items-center w-full">
          <Card className={`w-full max-w-[420px] p-8 md:p-10 shadow-xl ${mounted ? 'animate-fade-in' : ''}`}>
            <div className="mb-8 text-center">
              <h2 className="m-0 mb-2 text-2xl font-bold text-primary">
                {isLogin ? 'Welcome back' : 'Create an account'}
              </h2>
              <p className="m-0 text-sm text-secondary">
                {isLogin ? 'Enter your credentials to access your terminal.' : 'Start dominating the markets today.'}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-3 px-4 bg-loss/10 border border-loss/20 rounded-lg flex items-center gap-2.5">
                <Shield size={16} className="text-loss" />
                <span className="text-xs text-loss font-semibold">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {!isLogin && (
                <div className="form-group mb-0">
                  <label htmlFor="name" className="form-label text-xs font-semibold mb-1.5 block">Full Name</label>
                  <div className="relative flex items-center">
                    <User size={16} className="text-muted absolute left-3" />
                    <input
                      id="name"
                      type="text"
                      className="form-input bg-bg-primary pl-10 h-11 border-border w-full"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="form-group mb-0">
                <label htmlFor="email" className="form-label text-xs font-semibold mb-1.5 block">Email Address</label>
                <div className="relative flex items-center">
                  <Mail size={16} className="text-muted absolute left-3" />
                  <input
                    id="email"
                    type="email"
                    className="form-input bg-bg-primary pl-10 h-11 border-border w-full"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group mb-0">
                <label htmlFor="password" className="form-label text-xs font-semibold mb-1.5 block">Password</label>
                <div className="relative flex items-center">
                  <Lock size={16} className="text-muted absolute left-3" />
                  <input
                    id="password"
                    type="password"
                    className="form-input bg-bg-primary pl-10 h-11 border-border w-full"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {isLogin && (
                <div className="text-right -mt-2">
                  <button type="button" className="btn btn-ghost text-xs text-muted p-0 hover:bg-transparent hover:text-primary transition-colors">
                    Forgot password?
                  </button>
                </div>
              )}

              <button type="submit" className="btn btn-primary h-11 mt-2 justify-center font-bold text-sm shadow-md w-full" disabled={loading || attempts >= 5}>
                {loading ? (
                  <><RefreshCw size={16} className="animate-spin mr-2" /> Verifying...</>
                ) : (
                  <>{isLogin ? 'Sign In' : 'Sign Up'} <ArrowRight size={16} className="ml-2" /></>
                )}
              </button>
            </form>

            <div className="mt-8 text-center text-sm text-secondary">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                className="btn btn-ghost text-primary p-0 font-bold hover:bg-transparent hover:underline"
                disabled={loading}
                onClick={() => {
                  setIsLogin(!isLogin)
                  setError('')
                }}
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
