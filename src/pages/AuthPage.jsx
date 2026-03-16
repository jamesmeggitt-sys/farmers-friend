import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../lib/ToastContext'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const { addToast } = useToast()
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    email: '', password: '', displayName: '', farmName: ''
  })

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(form.email, form.password)
        addToast('Welcome back!')
      } else {
        if (!form.farmName.trim()) throw new Error('Farm name is required')
        if (!form.displayName.trim()) throw new Error('Your name is required')
        await signUp(form.email, form.password, form.displayName, form.farmName)
        addToast('Farm created! Welcome to the shed.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      {/* Background texture lines */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.015) 40px, rgba(255,255,255,0.015) 41px)',
      }} />

      <div style={{ width: '100%', maxWidth: 440, position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 8 }}>🏚️</div>
          <h1 style={{ fontSize: '2rem', textShadow: '3px 3px 0 var(--rust-dark)', lineHeight: 1.1 }}>
            WHO'S BEEN IN<br />MY SHED?!
          </h1>
          <p style={{ marginTop: 8, opacity: 0.55, fontFamily: 'Barlow Condensed', letterSpacing: 2, fontSize: '0.8rem', textTransform: 'uppercase' }}>
            Farm Equipment Traceability
          </p>
        </div>

        <div className="card">
          {/* Mode switcher */}
          <div style={{ display: 'flex', marginBottom: 24, background: 'var(--dirt2)', borderRadius: 'var(--radius)', padding: 3 }}>
            {['login', 'signup'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                style={{
                  flex: 1, padding: '8px', border: 'none', cursor: 'pointer',
                  borderRadius: 'var(--radius)',
                  background: mode === m ? 'var(--plank2)' : 'none',
                  color: mode === m ? 'var(--hay)' : 'var(--cream-muted)',
                  fontFamily: 'Barlow Condensed', fontWeight: 700,
                  letterSpacing: 2, textTransform: 'uppercase', fontSize: '0.85rem',
                  transition: 'all 0.15s',
                }}
              >
                {m === 'login' ? 'Sign In' : 'New Farm'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'signup' && (
              <>
                <div className="form-group">
                  <label>Farm Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Barker Grazing Co."
                    value={form.farmName}
                    onChange={set('farmName')}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Your Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Jake Thompson"
                    value={form.displayName}
                    onChange={set('displayName')}
                    required
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="you@farm.com.au"
                value={form.email}
                onChange={set('email')}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder={mode === 'signup' ? 'Min. 6 characters' : ''}
                value={form.password}
                onChange={set('password')}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {error && <div className="error-msg">⚠ {error}</div>}

            <button
              type="submit"
              className="btn btn-hay btn-lg btn-full"
              disabled={loading}
              style={{ marginTop: 4 }}
            >
              {loading
                ? <><span className="spinner" style={{ borderTopColor: 'var(--dirt)', width: 16, height: 16, borderWidth: 2 }} /> Loading...</>
                : mode === 'login' ? 'Sign In' : 'Create My Farm'
              }
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.78rem', opacity: 0.4, fontFamily: 'Barlow Condensed', letterSpacing: 1 }}>
          Your data is stored securely per-farm · All photos encrypted at rest
        </p>
      </div>
    </div>
  )
}
