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
    <div style={containerStyle}>
      {/* Dynamic Background Elements */}
      <div style={glow1Style} />
      <div style={glow2Style} />
      <div style={glow3Style} />

      <div style={gridStyle}>
        {/* Left Side: Branding / Landing Info */}
        <div style={brandSectionStyle} className={mounted ? 'animate-fade-in' : ''}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={logoSquareStyle}>G</div>
            <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 800, background: 'linear-gradient(135deg, #fff, #9ca3af)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Gestion
            </h1>
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0 0 16px 0', lineHeight: 1.2 }}>
            Master your portfolio with next-gen intelligence.
          </h2>
          <p style={{ fontSize: '1.05rem', color: '#9ca3af', lineHeight: 1.6, maxWidth: 450, margin: '0 0 40px 0' }}>
            Unleash institutional-grade analytics, smart algorithmic trading, and real-time market insights tailored for individual investors.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[
              { icon: <TrendingUp size={20} color="#60A5FA" />, title: 'Real-time Analytics', desc: 'Live pricing, CAGR, and XIRR tracking.' },
              { icon: <Globe size={20} color="#34D399" />, title: 'Deep Market Sectors', desc: 'Instant exposure analysis across 200+ equities.' },
              { icon: <Shield size={20} color="#FBBF24" />, title: 'Algorithmic Trading', desc: 'Configure powerful risk-managed strategies.' },
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={featureIconWrapper}>{f.icon}</div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 600, color: '#f3f4f6' }}>{f.title}</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#9ca3af' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div style={authSectionStyle}>
          <div style={glassCardStyle} className={mounted ? 'animate-fade-in' : ''}>
            <div style={{ marginBottom: 32, textAlign: 'center' }}>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '1.6rem', fontWeight: 700, color: '#f9fafb' }}>
                {isLogin ? 'Welcome back' : 'Create an account'}
              </h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#9ca3af' }}>
                {isLogin ? 'Enter your credentials to access your terminal.' : 'Start dominating the markets today.'}
              </p>
            </div>

            {error && (
              <div style={{ marginBottom: 20, padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Shield size={16} color="#ef4444" />
                <span style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 500 }}>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {!isLogin && (
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <div style={inputWrapperStyle}>
                    <User size={16} color="#6b7280" style={inputIconStyle} />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={inputStyle}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div style={inputWrapperStyle}>
                  <Mail size={16} color="#6b7280" style={inputIconStyle} />
                  <input
                    type="email"
                    className="form-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={inputStyle}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div style={inputWrapperStyle}>
                  <Lock size={16} color="#6b7280" style={inputIconStyle} />
                  <input
                    type="password"
                    className="form-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={inputStyle}
                    required
                  />
                </div>
              </div>

              {isLogin && (
                <div style={{ textAlign: 'right', marginTop: -6 }}>
                  <button type="button" className="btn btn-ghost" style={{ fontSize: '0.75rem', color: '#60A5FA', padding: 0 }}>
                    Forgot password?
                  </button>
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={submitBtnStyle} disabled={loading || attempts >= 5}>
                {loading ? (
                  <><RefreshCw size={16} className="animate-spin" /> Verifying...</>
                ) : (
                  <>{isLogin ? 'Sign In' : 'Sign Up'} <ArrowRight size={16} /></>
                )}
              </button>
            </form>

            <div style={{ marginTop: 24, textAlign: 'center', fontSize: '0.85rem', color: '#9ca3af' }}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setIsLogin(!isLogin)}
                style={{ color: '#60A5FA', padding: 0, fontWeight: 600, borderBottom: '1px solid transparent' }}
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

// ─── Inline CSS & Premium Styling ─────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  position: 'relative',
  width: '100vw',
  minHeight: '100vh',
  backgroundColor: '#0a0a0b',
  color: '#e5e7eb',
  overflowY: 'auto',
  overflowX: 'hidden',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '20px 0',
}

const gridStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 10,
  width: '100%',
  maxWidth: 1200,
  minHeight: 600,
  padding: '40px',
  display: 'grid',
  gridTemplateColumns: 'var(--auth-grid, repeat(auto-fit, minmax(350px, 1fr)))',
  gap: 60,
  alignItems: 'center',
}

const brandSectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
}

const logoSquareStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 12,
  background: 'linear-gradient(135deg, #3B82F6, #10B981)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1.4rem',
  fontWeight: 800,
  color: 'white',
  boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)',
}

const featureIconWrapper: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}

const authSectionStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%',
}

const glassCardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 420,
  background: 'rgba(17, 24, 39, 0.65)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 24,
  padding: '40px 32px',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
}

const inputWrapperStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
}

const inputIconStyle: React.CSSProperties = {
  position: 'absolute',
  left: 14,
}

const inputStyle: React.CSSProperties = {
  paddingLeft: 42,
  height: 44,
  background: 'rgba(0,0,0,0.3)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#f9fafb',
}

const submitBtnStyle: React.CSSProperties = {
  height: 46,
  marginTop: 10,
  background: 'linear-gradient(135deg, #3B82F6, #059669)',
  border: 'none',
  fontSize: '1rem',
  fontWeight: 600,
  textShadow: '0 1px 2px rgba(0,0,0,0.2)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: 8,
  boxShadow: '0 4px 14px rgba(59, 130, 246, 0.3)',
}

// Glowing orbs for abstract premium background
const glow1Style: React.CSSProperties = {
  position: 'absolute',
  top: '-15%',
  left: '-10%',
  width: '50vw',
  height: '50vw',
  background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 60%)',
  filter: 'blur(80px)',
  zIndex: 1,
}
const glow2Style: React.CSSProperties = {
  position: 'absolute',
  bottom: '-15%',
  right: '-10%',
  width: '60vw',
  height: '60vw',
  background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 60%)',
  filter: 'blur(100px)',
  zIndex: 1,
}
const glow3Style: React.CSSProperties = {
  position: 'absolute',
  top: '20%',
  right: '15%',
  width: '30vw',
  height: '30vw',
  background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 60%)',
  filter: 'blur(60px)',
  zIndex: 1,
}
