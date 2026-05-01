import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signUpWithEmail, signInWithGoogle } from '../services/firebase'
import { registerUser, getMe } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { INDUSTRIES, getAuthError } from '../utils/constants'
import GoogleIcon from '../components/GoogleIcon'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[\d\s+\-()]{7,15}$/

function validateStep1(email, password, confirm) {
  const e = {}
  if (!email)                     e.email    = 'Email is required.'
  else if (!EMAIL_RE.test(email)) e.email    = 'Enter a valid email address.'
  if (!password)                  e.password = 'Password is required.'
  else if (password.length < 6)   e.password = 'Password must be at least 6 characters.'
  if (!confirm)                   e.confirm  = 'Please confirm your password.'
  else if (confirm !== password)  e.confirm  = 'Passwords do not match.'
  return e
}

function validateStep2(name, phone, industry) {
  const e = {}
  if (!name || name.trim().length < 2) e.name     = 'Enter your full name (min. 2 characters).'
  if (phone && !PHONE_RE.test(phone))  e.phone    = 'Enter a valid phone number.'
  if (!industry)                       e.industry = 'Please select your industry.'
  return e
}

function getStrength(pwd) {
  if (!pwd) return null
  let score = 0
  if (pwd.length >= 8)           score++
  if (pwd.length >= 12)          score++
  if (/[A-Z]/.test(pwd))         score++
  if (/[0-9]/.test(pwd))         score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  if (score <= 1) return { label: 'Weak',   color: '#ef4444', pct: 30 }
  if (score <= 3) return { label: 'Medium', color: '#f59e0b', pct: 65 }
  return                { label: 'Strong', color: '#22c55e', pct: 100 }
}

function FieldError({ msg }) {
  if (!msg) return null
  return <p className="text-red-500 text-xs mt-1.5">{msg}</p>
}

function InputField({ label, error, icon, children, optional }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}{optional && <span className="font-normal text-slate-400 ml-1">(optional)</span>}
      </label>
      <div className="relative">
        {icon && (
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none">
            {icon}
          </span>
        )}
        {children}
      </div>
      <FieldError msg={error} />
    </div>
  )
}

const inputCls = (err, withIcon) =>
  `w-full ${withIcon ? 'pl-10' : 'pl-4'} pr-4 py-2.5 rounded-xl border text-sm outline-none transition-all bg-white ${
    err
      ? 'border-red-400 ring-1 ring-red-300'
      : 'border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20'
  }`

export default function SignUp() {
  const navigate      = useNavigate()
  const { setDbUser } = useAuth()
  const { toast, showToast, hideToast } = useToast()

  const [step, setStep]         = useState(1)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [name, setName]         = useState('')
  const [phone, setPhone]       = useState('')
  const [industry, setIndustry] = useState('')
  const [touched, setTouched]   = useState({})
  const [busy, setBusy]         = useState(false)

  const s1Errors = validateStep1(email, password, confirm)
  const s2Errors = validateStep2(name, phone, industry)
  const touch    = field => setTouched(t => ({ ...t, [field]: true }))
  const fieldErr = field => touched[field] ? (s1Errors[field] ?? s2Errors[field]) : undefined

  const strength = getStrength(password)

  function handleStep1(e) {
    e.preventDefault()
    setTouched(t => ({ ...t, email: true, password: true, confirm: true }))
    if (Object.keys(s1Errors).length) return
    setTouched({})
    setStep(2)
  }

  async function handleStep2(e) {
    e.preventDefault()
    setTouched(t => ({ ...t, name: true, phone: true, industry: true }))
    if (Object.keys(s2Errors).length) return
    setBusy(true)
    try {
      const cred  = await signUpWithEmail(email, password)
      const token = await cred.user.getIdToken()
      const data  = await registerUser(token, { name: name.trim(), phoneNumber: phone || null, industry })
      setDbUser(data)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      console.error('[Email signup error]', err)
      showToast(getAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleGoogle() {
    setBusy(true)
    try {
      const cred  = await signInWithGoogle()
      const token = await cred.user.getIdToken()
      const data  = await getMe(token)
      setDbUser(data)
      navigate(data ? '/dashboard' : '/onboarding', { replace: true })
    } catch (err) {
      console.error('[Google signup error]', err)
      showToast(getAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <Toast toast={toast} onClose={hideToast} />

      <div className="w-full max-w-[480px]">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-base">smart_toy</span>
          </div>
          <span className="font-black text-xl text-slate-900 tracking-tight">Leadcense</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Card header */}
          <div className="px-8 pt-8 pb-6 text-center border-b border-slate-100">
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-indigo-600 text-[28px]">
                {step === 1 ? 'rocket_launch' : 'badge'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">
              {step === 1 ? 'Create your account' : 'About your business'}
            </h1>
            <p className="text-slate-500 text-sm">
              {step === 1 ? 'Start qualifying leads with AI' : 'Step 2 of 2 — almost there'}
            </p>

            {/* Step indicator */}
            <div className="flex gap-2 justify-center mt-5">
              {[1, 2].map(n => (
                <div
                  key={n}
                  className="h-1 w-12 rounded-full transition-all duration-300"
                  style={{ background: n <= step ? '#4f46e5' : '#e2e8f0' }}
                />
              ))}
            </div>
          </div>

          {/* Card body */}
          <div className="px-8 py-6">
            {step === 1 && (
              <>
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={busy}
                  className="w-full flex items-center justify-center gap-3 border border-slate-300 rounded-xl py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-5"
                >
                  <GoogleIcon />
                  Continue with Google
                </button>

                <div className="flex items-center gap-3 mb-5">
                  <hr className="flex-1 border-slate-200" />
                  <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">or</span>
                  <hr className="flex-1 border-slate-200" />
                </div>

                <form onSubmit={handleStep1} noValidate className="flex flex-col gap-4">
                  <InputField label="Email address" error={fieldErr('email')} icon="mail">
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onBlur={() => touch('email')}
                      placeholder="you@company.com"
                      autoComplete="email"
                      className={inputCls(fieldErr('email'), true)}
                    />
                  </InputField>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none">lock</span>
                      <input
                        type={showPwd ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onBlur={() => touch('password')}
                        placeholder="Min. 6 characters"
                        autoComplete="new-password"
                        className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm outline-none transition-all bg-white ${
                          fieldErr('password')
                            ? 'border-red-400 ring-1 ring-red-300'
                            : 'border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <span className="material-symbols-outlined text-[18px]">{showPwd ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                    {password && strength && (
                      <div className="mt-2">
                        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${strength.pct}%`, background: strength.color }}
                          />
                        </div>
                        <p className="text-xs mt-1 text-right font-medium" style={{ color: strength.color }}>
                          {strength.label} password
                        </p>
                      </div>
                    )}
                    <FieldError msg={fieldErr('password')} />
                  </div>

                  <InputField label="Confirm password" error={fieldErr('confirm')} icon="lock">
                    <input
                      type="password"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      onBlur={() => touch('confirm')}
                      placeholder="Repeat password"
                      autoComplete="new-password"
                      className={inputCls(fieldErr('confirm'), true)}
                    />
                  </InputField>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-1"
                  >
                    Continue
                  </button>
                </form>
              </>
            )}

            {step === 2 && (
              <form onSubmit={handleStep2} noValidate className="flex flex-col gap-4">
                <InputField label="Full name" error={fieldErr('name')} icon="person">
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onBlur={() => touch('name')}
                    placeholder="Jane Smith"
                    autoComplete="name"
                    className={inputCls(fieldErr('name'), true)}
                  />
                </InputField>

                <InputField label="Phone" error={fieldErr('phone')} icon="call" optional>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    onBlur={() => touch('phone')}
                    placeholder="+1 555 000 0000"
                    autoComplete="tel"
                    className={inputCls(fieldErr('phone'), true)}
                  />
                </InputField>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Industry</label>
                  <select
                    value={industry}
                    onChange={e => setIndustry(e.target.value)}
                    onBlur={() => touch('industry')}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all bg-white cursor-pointer ${
                      fieldErr('industry')
                        ? 'border-red-400 ring-1 ring-red-300'
                        : 'border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20'
                    }`}
                  >
                    <option value="" disabled>Select your industry</option>
                    {INDUSTRIES.map(i => (
                      <option key={i.value} value={i.value}>{i.label}</option>
                    ))}
                  </select>
                  <FieldError msg={fieldErr('industry')} />
                </div>

                <div className="flex gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setTouched({}) }}
                    className="flex-1 py-3 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {busy ? 'Creating account…' : 'Create account'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {step === 1 && (
          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/signin" className="text-indigo-600 font-semibold hover:underline">Sign in</Link>
          </p>
        )}
        <div className="text-center mt-3">
          <Link to="/" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">← Back to home</Link>
        </div>
      </div>
    </div>
  )
}
