import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../services/firebase'
import { registerUser } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { INDUSTRIES } from '../utils/constants'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'

const PHONE_RE = /^[\d\s+\-()]{7,15}$/

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

  // Page state
  const [page, setPage] = useState(1)

  // Page 1: Personal Info
  const [name, setName]         = useState('')
  const [phone, setPhone]       = useState('')
  const [industry, setIndustry] = useState('')
  const [touched1, setTouched1] = useState({})

  // Page 3: Company Info
  const [companyName, setCompanyName]   = useState('')
  const [companySize, setCompanySize]   = useState('')
  const [location, setLocation]         = useState('')
  const [services, setServices]         = useState('')
  const [description, setDescription]   = useState('')
  const [touched3, setTouched3]         = useState({})

  const [busy, setBusy]         = useState(false)

  const submittedRef = useRef(false)
  useEffect(() => {
    return () => {
      if (!submittedRef.current && auth.currentUser) {
        auth.currentUser.delete().catch(() => {})
      }
    }
  }, [])

  // Validation
  function validatePage1() {
    const e = {}
    if (!name || name.trim().length < 2) e.name     = 'Enter your full name (min. 2 characters).'
    if (phone && !PHONE_RE.test(phone))  e.phone    = 'Enter a valid phone number.'
    if (!industry)                       e.industry = 'Please select your industry.'
    return e
  }

  function validatePage3() {
    const e = {}
    if (!companyName || companyName.trim().length < 2) e.companyName = 'Enter company name (min. 2 characters).'
    if (!companySize) e.companySize = 'Please select company size.'
    if (!location || location.trim().length < 2) e.location = 'Enter location (min. 2 characters).'
    return e
  }

  const errors1   = validatePage1()
  const errors3   = validatePage3()

  const touch1    = field => setTouched1(t => ({ ...t, [field]: true }))
  const touch3    = field => setTouched3(t => ({ ...t, [field]: true }))
  
  const fieldErr1 = field => touched1[field] ? errors1[field] : undefined
  const fieldErr3 = field => touched3[field] ? errors3[field] : undefined

  const canProceedPage1 = Object.keys(errors1).length === 0

  async function handleNext() {
    if (page === 1) {
      setTouched1({ name: true, phone: true, industry: true })
      if (!canProceedPage1) return
      setPage(2)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (page !== 3) return

    setTouched3({ companyName: true, companySize: true, location: true })
    if (Object.keys(errors3).length) return

    setBusy(true)
    try {
      const token = await firebaseUser.getIdToken()
      const data  = await registerUser(token, {
        name: name.trim(),
        phoneNumber: phone || null,
        industry,
        companyName: companyName.trim(),
        companySize,
        location: location.trim(),
        services: services || null,
        description: description || null,
      })
      submittedRef.current = true
      setDbUser(data)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      showToast(err.message || 'Failed to complete setup. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  // Calculate progress bar based on all fields
  let completeness = 0
  if (name.trim().length >= 2) completeness += 25
  if (industry) completeness += 25
  if (phone) completeness += 8
  if (companyName.trim().length >= 2) completeness += 17
  if (companySize) completeness += 17
  if (location.trim().length >= 2) completeness += 8

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
            <p className="mt-2 text-sm text-slate-500">
              {page === 1 && 'Tell us about yourself.'}
              {page === 2 && 'Configure your agent preferences.'}
              {page === 3 && 'Complete your company information.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

              {/* ── Left column ── */}
              <div className="lg:col-span-7 flex flex-col gap-6">

                {/* PAGE 1: Account Profile */}
                {page === 1 && (
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
                          onBlur={() => touch1('name')}
                          placeholder="Jane Smith"
                          autoComplete="name"
                          className={fieldCls(fieldErr1('name'))}
                        />
                        <FieldError msg={fieldErr1('name')} />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          Phone <span className="text-slate-400 font-normal">(optional)</span>
                        </label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          onBlur={() => touch1('phone')}
                          placeholder="+1 555 000 0000"
                          autoComplete="tel"
                          className={fieldCls(fieldErr1('phone'))}
                        />
                        <FieldError msg={fieldErr1('phone')} />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Industry</label>
                        <select
                          value={industry}
                          onChange={e => setIndustry(e.target.value)}
                          onBlur={() => touch1('industry')}
                          className={`${fieldCls(fieldErr1('industry'))} cursor-pointer`}
                        >
                          <option value="" disabled>Select your industry</option>
                          {INDUSTRIES.map(i => (
                            <option key={i.value} value={i.value}>{i.label}</option>
                          ))}
                        </select>
                        <FieldError msg={fieldErr1('industry')} />
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
                )}

                {/* PAGE 2: Agent Preferences */}
                {page === 2 && (
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
                )}

                {/* PAGE 3: Company Information */}
                {page === 3 && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                      <h2 className="text-base font-semibold text-slate-900">Company Information</h2>
                      <span className="material-symbols-outlined text-slate-300">business</span>
                    </div>
                    <div className="p-6 flex flex-col gap-5">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Company Name</label>
                        <input
                          type="text"
                          value={companyName}
                          onChange={e => setCompanyName(e.target.value)}
                          onBlur={() => touch3('companyName')}
                          placeholder="Your Company Inc."
                          className={fieldCls(fieldErr3('companyName'))}
                        />
                        <FieldError msg={fieldErr3('companyName')} />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Company Size</label>
                        <select
                          value={companySize}
                          onChange={e => setCompanySize(e.target.value)}
                          onBlur={() => touch3('companySize')}
                          className={`${fieldCls(fieldErr3('companySize'))} cursor-pointer`}
                        >
                          <option value="" disabled>Select company size</option>
                          <option value="1-10">1-10 employees</option>
                          <option value="11-50">11-50 employees</option>
                          <option value="51-200">51-200 employees</option>
                          <option value="201-500">201-500 employees</option>
                          <option value="500+">500+ employees</option>
                        </select>
                        <FieldError msg={fieldErr3('companySize')} />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Location</label>
                        <input
                          type="text"
                          value={location}
                          onChange={e => setLocation(e.target.value)}
                          onBlur={() => touch3('location')}
                          placeholder="City, Country"
                          className={fieldCls(fieldErr3('location'))}
                        />
                        <FieldError msg={fieldErr3('location')} />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          Services <span className="text-slate-400 font-normal">(optional)</span>
                        </label>
                        <textarea
                          value={services}
                          onChange={e => setServices(e.target.value)}
                          placeholder="Describe the main services or products your company offers"
                          rows="3"
                          className={fieldCls(false)}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          Description <span className="text-slate-400 font-normal">(optional)</span>
                        </label>
                        <textarea
                          value={description}
                          onChange={e => setDescription(e.target.value)}
                          placeholder="Brief description of your company and its mission"
                          rows="3"
                          className={fieldCls(false)}
                        />
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* ── Right column ── */}
              <div className="lg:col-span-5 flex flex-col gap-6">

                {/* Operating Hours */}
                {page !== 3 && (
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
                )}

                {/* Pro tip */}
                {page !== 3 && (
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
                )}

                {/* Progress indicator */}
                {page === 3 && (
                  <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-5">
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-indigo-600 text-[20px] mt-0.5">info</span>
                      <div>
                        <p className="text-sm font-semibold text-indigo-900 mb-1">Almost Done!</p>
                        <p className="text-xs text-indigo-700 leading-relaxed">
                          Review your company information and complete the setup to start using your AI lead qualifier.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Profile completeness */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-slate-700">Setup Progress</span>
                    <span className="text-sm font-bold text-indigo-600">{completeness}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${completeness}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    {page === 1 && 'Step 1 of 3: Personal Information'}
                    {page === 2 && 'Step 2 of 3: Agent Preferences'}
                    {page === 3 && 'Step 3 of 3: Company Information'}
                  </p>
                </div>

                {/* Navigation buttons */}
                <div className="flex gap-3">
                  {page > 1 && (
                    <button
                      type="button"
                      onClick={() => setPage(page - 1)}
                      className="flex-1 py-3.5 bg-white text-slate-900 rounded-2xl text-sm font-semibold hover:bg-slate-50 transition-colors border border-slate-200 shadow-sm"
                    >
                      ← Back
                    </button>
                  )}
                  {page < 3 && (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="flex-1 py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      Next →
                    </button>
                  )}
                  {page === 3 && (
                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                    >
                      {busy ? 'Setting up…' : 'Complete Setup →'}
                    </button>
                  )}
                </div>

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
