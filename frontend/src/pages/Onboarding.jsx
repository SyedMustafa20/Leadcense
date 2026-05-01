import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../services/firebase'
import { registerUser } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { INDUSTRIES } from '../utils/constants'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'

const PHONE_RE = /^[\d\s+\-()]{7,15}$/

function validate(name, phone, industry) {
  const e = {}
  if (!name || name.trim().length < 2) e.name     = 'Enter your full name (min. 2 characters).'
  if (phone && !PHONE_RE.test(phone))  e.phone    = 'Enter a valid phone number.'
  if (!industry)                       e.industry = 'Please select your industry.'
  return e
}

function FieldError({ msg }) {
  if (!msg) return null
  return <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">error</span>{msg}</p>
}

const fieldCls = err =>
  `w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all bg-white ${
    err
      ? 'border-red-400 ring-1 ring-red-300'
      : 'border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20'
  }`

export default function Onboarding() {
  const navigate      = useNavigate()
  const { firebaseUser, setDbUser } = useAuth()
  const { toast, showToast, hideToast } = useToast()

  const [name, setName]         = useState('')
  const [phone, setPhone]       = useState('')
  const [industry, setIndustry] = useState('')
  const [touched, setTouched]   = useState({})
  const [busy, setBusy]         = useState(false)
  const [completeness, setCompleteness] = useState(20)

  const errors   = validate(name, phone, industry)
  const touch    = field => setTouched(t => ({ ...t, [field]: true }))
  const fieldErr = field => touched[field] ? errors[field] : undefined

  useEffect(() => {
    let pct = 20
    if (name.trim().length >= 2) pct += 35
    if (industry) pct += 35
    if (phone) pct += 10
    setCompleteness(Math.min(pct, 100))
  }, [name, industry, phone])

  const submittedRef = useRef(false)
  useEffect(() => {
    return () => {
      if (!submittedRef.current && auth.currentUser) {
        auth.currentUser.delete().catch(() => {})
      }
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setTouched({ name: true, phone: true, industry: true })
    if (Object.keys(errors).length) return
    setBusy(true)
    try {
      const token = await firebaseUser.getIdToken()
      const data  = await registerUser(token, { name: name.trim(), phoneNumber: phone || null, industry })
      submittedRef.current = true
      setDbUser(data)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      showToast(err.message || 'Failed to complete setup. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Toast toast={toast} onClose={hideToast} />

      {/* Simple header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-lg">smart_toy</span>
          </div>
          <span className="font-black text-slate-900 text-lg tracking-tight">Leadcense</span>
        </div>
      </header>

      <main className="p-6 lg:p-10">
        <div className="mx-auto max-w-5xl">

          {/* Page heading */}
          <div className="mb-8">
            <h1 className="text-h1 font-h1 text-slate-900">Set up your workspace</h1>
            <p className="mt-2 text-sm text-slate-500">Complete your profile to start using your AI lead qualifier.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

              {/* ── Left column ── */}
              <div className="lg:col-span-7 flex flex-col gap-6">

                {/* Account Profile */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-slate-900">Account Profile</h2>
                    <span className="material-symbols-outlined text-slate-300">person</span>
                  </div>
                  <div className="p-6 flex flex-col gap-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Your Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onBlur={() => touch('name')}
                        placeholder="Jane Smith"
                        autoComplete="name"
                        className={fieldCls(fieldErr('name'))}
                      />
                      <FieldError msg={fieldErr('name')} />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Phone <span className="text-slate-400 font-normal">(optional)</span>
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        onBlur={() => touch('phone')}
                        placeholder="+1 555 000 0000"
                        autoComplete="tel"
                        className={fieldCls(fieldErr('phone'))}
                      />
                      <FieldError msg={fieldErr('phone')} />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Industry</label>
                      <select
                        value={industry}
                        onChange={e => setIndustry(e.target.value)}
                        onBlur={() => touch('industry')}
                        className={`${fieldCls(fieldErr('industry'))} cursor-pointer`}
                      >
                        <option value="" disabled>Select your industry</option>
                        {INDUSTRIES.map(i => (
                          <option key={i.value} value={i.value}>{i.label}</option>
                        ))}
                      </select>
                      <FieldError msg={fieldErr('industry')} />
                    </div>

                    {/* Role buttons (decorative) */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Your Role</label>
                      <div className="flex flex-wrap gap-2">
                        {['Admin', 'Agent', 'Analyst', 'Manager'].map((role, i) => (
                          <button
                            key={role}
                            type="button"
                            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                              i === 0
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                            }`}
                          >
                            {role}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Agent Preferences */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-slate-900">Agent Preferences</h2>
                    <span className="material-symbols-outlined text-slate-300">tune</span>
                  </div>
                  <div className="p-6 flex flex-col gap-5">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-slate-700">Agent Tone</label>
                        <span className="text-xs text-slate-400">Friendly → Corporate</span>
                      </div>
                      <input type="range" min="0" max="100" defaultValue="40"
                        className="w-full accent-indigo-600" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Response Speed</label>
                      <div className="flex gap-2">
                        {['Instant', 'Standard', 'Delayed'].map((s, i) => (
                          <button key={s} type="button"
                            className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                              i === 1
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Right column ── */}
              <div className="lg:col-span-5 flex flex-col gap-6">

                {/* Operating Hours */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-slate-900">Operating Hours</h2>
                    <span className="material-symbols-outlined text-slate-300">schedule</span>
                  </div>
                  <div className="p-6 flex flex-col gap-3">
                    {[
                      { label: 'Monday – Friday', time: '09:00 – 18:00', on: true },
                      { label: 'Saturday',        time: '10:00 – 14:00', on: false },
                      { label: 'Sunday',           time: 'Closed',       on: false },
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3">
                          <input type="checkbox" defaultChecked={row.on} className="accent-indigo-600 w-4 h-4" />
                          <span className="text-sm text-slate-700">{row.label}</span>
                        </div>
                        <span className="text-xs text-slate-400">{row.time}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pro tip */}
                <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-5">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-indigo-600 text-[20px] mt-0.5">lightbulb</span>
                    <div>
                      <p className="text-sm font-semibold text-indigo-900 mb-1">Pro tip</p>
                      <p className="text-xs text-indigo-700 leading-relaxed">
                        You can fine-tune your agent's conversation flow and knowledge base anytime from the Agents section.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Profile completeness */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-slate-700">Profile Completeness</span>
                    <span className="text-sm font-bold text-indigo-600">{completeness}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${completeness}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    {completeness < 90 ? 'Add your name and industry to continue.' : 'Looking great! Ready to complete setup.'}
                  </p>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                >
                  {busy ? 'Setting up…' : 'Complete Setup →'}
                </button>

                <p className="text-center text-xs text-slate-400">
                  You can change these settings anytime from your dashboard.
                </p>
              </div>

            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
