import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signInWithEmail, signInWithGoogle } from '../services/firebase'
import { getMe } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { getAuthError } from '../utils/constants'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(email, password) {
  const e = {}
  if (!email)                     e.email    = 'Email is required.'
  else if (!EMAIL_RE.test(email)) e.email    = 'Enter a valid email address.'
  if (!password)                  e.password = 'Password is required.'
  else if (password.length < 6)   e.password = 'Password must be at least 6 characters.'
  return e
}

const S = {
  page:       { display: 'flex', minHeight: '100vh', fontFamily: 'Inter, sans-serif', background: '#f8f9ff' },
  aside:      { width: '50%', flexShrink: 0, position: 'relative', background: '#3525cd', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  imgWrap:    { position: 'absolute', inset: 0, zIndex: 0 },
  img:        { width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3, mixBlendMode: 'overlay' },
  asideInner: { position: 'relative', zIndex: 10, padding: '48px', width: '100%', maxWidth: '540px' },
  asideTitle: { fontSize: '36px', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', lineHeight: '44px', marginBottom: '16px' },
  asideSub:   { fontSize: '18px', lineHeight: '28px', color: '#dad7ff', opacity: 0.9 },
  cardGrid:   { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '48px' },
  card:       { padding: '20px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(4px)' },
  cardTitle:  { fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '4px', marginTop: '8px' },
  cardDesc:   { fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5' },
  main:       { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', background: '#f8f9ff', overflowY: 'auto' },
  inner:      { width: '100%', maxWidth: '440px' },
  heading:    { fontSize: '30px', fontWeight: 600, color: '#0b1c30', letterSpacing: '-0.02em', lineHeight: '38px', marginBottom: '4px' },
  subheading: { fontSize: '16px', color: '#464555', lineHeight: '24px', marginBottom: '32px' },
  label:      { display: 'block', fontSize: '14px', fontWeight: 500, color: '#464555', marginBottom: '6px' },
  inputWrap:  { position: 'relative', marginBottom: '4px' },
  iconLeft:   { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#777587', fontSize: '20px', pointerEvents: 'none', userSelect: 'none' },
  input:      { display: 'block', width: '100%', boxSizing: 'border-box', paddingLeft: '44px', paddingRight: '16px', paddingTop: '9px', paddingBottom: '9px', fontSize: '14px', color: '#0b1c30', background: '#fff', border: '1px solid #c7c4d8', outline: 'none', lineHeight: '20px' },
  inputErr:   { borderColor: '#f87171' },
  errMsg:     { fontSize: '12px', color: '#ef4444', marginTop: '4px' },
  fieldRow:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' },
  forgotLink: { fontSize: '12px', fontWeight: 600, color: '#4f46e5', letterSpacing: '0.02em', textDecoration: 'none' },
  submitBtn:  { display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '13px 24px', background: '#4f46e5', color: '#fff', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer', marginTop: '24px', marginBottom: '0', transition: 'background 0.15s', boxSizing: 'border-box' },
  dividerRow: { position: 'relative', margin: '28px 0' },
  divLine:    { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' },
  divText:    { position: 'relative', display: 'flex', justifyContent: 'center' },
  divLabel:   { padding: '0 16px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', color: '#777587', background: '#f8f9ff' },
  googleBtn:  { display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '13px 24px', background: '#fff', color: '#0b1c30', fontSize: '14px', fontWeight: 500, border: '1px solid #c7c4d8', cursor: 'pointer', marginBottom: '28px', transition: 'background 0.15s', boxSizing: 'border-box' },
  signupRow:  { textAlign: 'center', fontSize: '14px', color: '#464555' },
  signupLink: { fontSize: '14px', fontWeight: 500, color: '#4f46e5', marginLeft: '4px' },
  footer:     { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px', borderTop: '1px solid rgba(199,196,216,0.4)', paddingTop: '20px', marginTop: '24px' },
  footLink:   { fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', color: '#777587', textDecoration: 'none' },
}

export default function SignIn() {
  const navigate      = useNavigate()
  const { setDbUser } = useAuth()
  const { toast, showToast, hideToast } = useToast()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched]   = useState({})
  const [busy, setBusy]         = useState(false)

  const errors   = validate(email, password)
  const touch    = field => setTouched(t => ({ ...t, [field]: true }))
  const fieldErr = field => touched[field] ? errors[field] : undefined

  async function afterAuth(cred) {
    const token = await cred.user.getIdToken()
    const data  = await getMe(token)
    setDbUser(data)
    navigate(data ? '/dashboard' : '/onboarding', { replace: true })
  }

  async function handleEmail(e) {
    e.preventDefault()
    setTouched({ email: true, password: true })
    if (Object.keys(errors).length) return
    setBusy(true)
    try {
      await afterAuth(await signInWithEmail(email, password))
    } catch (err) {
      console.error('[Email signin error]', err)
      showToast(getAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleGoogle() {
    setBusy(true)
    try {
      await afterAuth(await signInWithGoogle())
    } catch (err) {
      console.error('[Google signin error]', err)
      showToast(getAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={S.page}>
      <Toast toast={toast} onClose={hideToast} />

      {/* ── Left panel (desktop only) ── */}
      <aside className="hidden lg:flex" style={S.aside}>
        <div style={S.imgWrap}>
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBJPuGqp17aelVh8FlzXLcgUjyaML0RR5mDXozsmwS09BeLbOGHRzlUUVezS42jpSG0tSDQk0YD5tW81myrd2Goeb1PuI8tpyhHkYyCvGgNRNiNf3X_kj31qPhUejagBmtPhn1_HhGrqJEYqNFog2xQmFwHWXDNIinnVJp6zu364jgs4dnIXsoCi-Q2DobkUZ8oKToYLGDhMIYg3YY0XvVf3hbe9JsNBP9QPN4msEt5qGvajpGcaPNqWXI64jC-ekQvuGU86fSZng"
            alt="Leadcense Enterprise Visual"
            style={S.img}
          />
        </div>
        <div style={S.asideInner}>
          <div style={{ marginBottom: '24px' }}>
            <div style={S.asideTitle}>Leadcense</div>
            <p style={S.asideSub}>
              Empowering enterprise sales teams with analytical rigor and autonomous AI lead intelligence.
            </p>
          </div>
          <div style={S.cardGrid}>
            <div style={S.card}>
              <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '22px' }}>insights</span>
              <div style={S.cardTitle}>Predictive Scoring</div>
              <p style={S.cardDesc}>Advanced lead prioritization via proprietary AI.</p>
            </div>
            <div style={S.card}>
              <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '22px' }}>security</span>
              <div style={S.cardTitle}>Enterprise Grade</div>
              <p style={S.cardDesc}>SOC2 compliant data processing at scale.</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Right panel ── */}
      <main style={S.main}>
        <div style={S.inner}>

          {/* Mobile logo */}
          <div className="lg:hidden" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
            <div style={{ width: '32px', height: '32px', background: '#4f46e5', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '18px' }}>smart_toy</span>
            </div>
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#4f46e5', letterSpacing: '-0.02em' }}>Leadcense</span>
          </div>

          {/* Heading */}
          <h1 style={S.heading}>Welcome back</h1>
          <p style={S.subheading}>Enter your credentials to access your dashboard.</p>

          {/* Form */}
          <form onSubmit={handleEmail} noValidate>

            {/* Email */}
            <div style={{ marginBottom: '20px' }}>
              <label style={S.label} htmlFor="email">Email</label>
              <div style={S.inputWrap}>
                <span className="material-symbols-outlined" style={S.iconLeft}>mail</span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onBlur={() => touch('email')}
                  placeholder="name@enterprise.com"
                  autoComplete="email"
                  style={{ ...S.input, ...(fieldErr('email') ? S.inputErr : {}) }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#4f46e5'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.15)' }}
                  onBlurCapture={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = fieldErr('email') ? '#f87171' : '#c7c4d8' }}
                />
              </div>
              {fieldErr('email') && <p style={S.errMsg}>{fieldErr('email')}</p>}
            </div>

            {/* Password */}
            <div style={{ marginBottom: '8px' }}>
              <div style={S.fieldRow}>
                <label style={{ ...S.label, marginBottom: 0 }} htmlFor="password">Password</label>
                <a href="#" style={S.forgotLink}>Forgot password?</a>
              </div>
              <div style={{ ...S.inputWrap, marginTop: '6px' }}>
                <span className="material-symbols-outlined" style={S.iconLeft}>lock</span>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onBlur={() => touch('password')}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{ ...S.input, ...(fieldErr('password') ? S.inputErr : {}) }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#4f46e5'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.15)' }}
                  onBlurCapture={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = fieldErr('password') ? '#f87171' : '#c7c4d8' }}
                />
              </div>
              {fieldErr('password') && <p style={S.errMsg}>{fieldErr('password')}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={busy}
              style={{ ...S.submitBtn, opacity: busy ? 0.65 : 1, cursor: busy ? 'not-allowed' : 'pointer' }}
              onMouseEnter={e => { if (!busy) e.currentTarget.style.background = '#4338ca' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#4f46e5' }}
            >
              {busy ? 'Signing in…' : 'Sign In'}
              {!busy && <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>}
            </button>
          </form>

          {/* Divider */}
          <div style={S.dividerRow}>
            <div style={S.divLine}>
              <div style={{ width: '100%', borderTop: '1px solid #c7c4d8' }} />
            </div>
            <div style={S.divText}>
              <span style={S.divLabel}>OR CONTINUE WITH</span>
            </div>
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            style={{ ...S.googleBtn, opacity: busy ? 0.55 : 1, cursor: busy ? 'not-allowed' : 'pointer' }}
            onMouseEnter={e => { if (!busy) e.currentTarget.style.background = '#eff4ff' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
          >
            <svg style={{ width: '20px', height: '20px', flexShrink: 0 }} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Sign in with Google
          </button>

          {/* Sign up */}
          <p style={S.signupRow}>
            Don't have an account?
            <Link to="/signup" style={S.signupLink}>Create account</Link>
          </p>


        </div>
      </main>
    </div>
  )
}
