import { useState } from 'react'
import Layout from '../components/Layout'
import Toast from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../hooks/useToast'
import { logOut } from '../services/firebase'
import { updateUser, updateCompany, deleteUser } from '../services/api'
import { useNavigate } from 'react-router-dom'

const inputCls = (editable = true) =>
  `w-full px-4 py-2.5 border rounded-xl text-sm outline-none transition-all ${
    editable
      ? 'border-slate-300 bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20'
      : 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed'
  }`

function Section({ title, icon, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <span className="material-symbols-outlined text-slate-300">{icon}</span>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

export default function Settings() {
  const { dbUser, setDbUser, firebaseUser } = useAuth()
  const navigate = useNavigate()
  const { toast, showToast, hideToast } = useToast()

  const user    = dbUser?.user
  const company = dbUser?.company_info

  // ── Personal info state ──────────────────────────────────────────────────
  const [name, setName] = useState(user?.name ?? '')
  const [savingUser, setSavingUser] = useState(false)

  // ── Company info state ───────────────────────────────────────────────────
  const [companyName, setCompanyName]   = useState(company?.company_name ?? '')
  const [companySize, setCompanySize]   = useState(company?.company_size ?? '')
  const [location, setLocation]         = useState(company?.location ?? '')
  const [website, setWebsite]           = useState(company?.website ?? '')
  const [services, setServices]         = useState(company?.services ?? '')
  const [description, setDescription]   = useState(company?.description ?? '')
  const [savingCompany, setSavingCompany] = useState(false)

  const [deletingAccount, setDeletingAccount] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  async function handleSaveUser(e) {
    e.preventDefault()
    if (!name.trim()) return showToast('Name cannot be empty.')
    setSavingUser(true)
    try {
      const token = await firebaseUser.getIdToken()
      await updateUser(token, { name: name.trim() })
      setDbUser(prev => ({ ...prev, user: { ...prev.user, name: name.trim() } }))
      showToast('Profile updated.')
    } catch (err) {
      showToast(err.message || 'Failed to save profile.')
    } finally {
      setSavingUser(false)
    }
  }

  async function handleSaveCompany(e) {
    e.preventDefault()
    if (!companyName.trim()) return showToast('Company name cannot be empty.')
    setSavingCompany(true)
    try {
      const token = await firebaseUser.getIdToken()
      const updated = await updateCompany(token, {
        company_name: companyName.trim(),
        company_size: companySize || null,
        location: location.trim() || null,
        website: website.trim() || null,
        services: services.trim() || null,
        description: description.trim() || null,
      })
      setDbUser(prev => ({ ...prev, company_info: { ...prev.company_info, ...updated } }))
      showToast('Company info saved.')
    } catch (err) {
      showToast(err.message || 'Failed to save company info.')
    } finally {
      setSavingCompany(false)
    }
  }

  async function handleDeleteAccount() {
    setDeletingAccount(true)
    try {
      const token = await firebaseUser.getIdToken()
      await deleteUser(token)
      await logOut()
      navigate('/', { replace: true })
    } catch (err) {
      showToast(err.message || 'Failed to delete account.')
      setDeletingAccount(false)
      setShowDeleteConfirm(false)
    }
  }

  async function handleSignOut() {
    await logOut()
    navigate('/', { replace: true })
  }

  return (
    <Layout>
      <Toast toast={toast} onClose={hideToast} />
      <main className="bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-3xl">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
            <p className="mt-1 text-sm text-slate-500">Manage your profile, company info, and account.</p>
          </div>

          <div className="flex flex-col gap-6">

            {/* ── Profile identity card ── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-r from-indigo-600 to-indigo-800 opacity-10 pointer-events-none" />
              <div className="relative flex items-center gap-5">
                <div className="h-20 w-20 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-black border-4 border-white shadow-md shrink-0">
                  {initials}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{user?.name ?? 'Your Name'}</h2>
                  <p className="text-sm text-slate-500 mt-0.5">{user?.email}</p>
                  <p className="text-xs text-slate-400 mt-0.5 capitalize">{user?.industry ?? ''}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="ml-auto flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">logout</span>
                  Sign out
                </button>
              </div>
            </div>

            {/* ── Personal information ── */}
            <Section title="Personal Information" icon="badge">
              <form onSubmit={handleSaveUser} noValidate>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Your name"
                      className={inputCls(true)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                    <input readOnly value={user?.email ?? ''} className={inputCls(false)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number</label>
                    <input readOnly value={user?.phone_number ?? ''} placeholder="—" className={inputCls(false)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Industry</label>
                    <input readOnly value={user?.industry ?? ''} className={inputCls(false)} />
                  </div>
                </div>
                <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button type="button" onClick={() => setName(user?.name ?? '')} className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                    Reset
                  </button>
                  <button type="submit" disabled={savingUser} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60">
                    {savingUser ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </Section>

            {/* ── Company information ── */}
            <Section title="Company Information" icon="business">
              <form onSubmit={handleSaveCompany} noValidate>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Company Name</label>
                    <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Company Inc." className={inputCls(true)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Company Size</label>
                    <select value={companySize} onChange={e => setCompanySize(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 cursor-pointer">
                      <option value="">Select size</option>
                      <option value="1-10">1–10 employees</option>
                      <option value="11-50">11–50 employees</option>
                      <option value="51-200">51–200 employees</option>
                      <option value="201-500">201–500 employees</option>
                      <option value="500+">500+ employees</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Location</label>
                    <input value={location} onChange={e => setLocation(e.target.value)} placeholder="City, Country" className={inputCls(true)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Website <span className="text-slate-400 font-normal">(optional)</span></label>
                    <input type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yourcompany.com" className={inputCls(true)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Services <span className="text-slate-400 font-normal">(optional)</span></label>
                    <textarea rows={3} value={services} onChange={e => setServices(e.target.value)} placeholder="Main services or products your company offers…" className={`${inputCls(true)} resize-none`} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Description <span className="text-slate-400 font-normal">(optional)</span></label>
                    <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description of your company…" className={`${inputCls(true)} resize-none`} />
                  </div>
                </div>
                <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button type="button" onClick={() => {
                    setCompanyName(company?.company_name ?? '')
                    setCompanySize(company?.company_size ?? '')
                    setLocation(company?.location ?? '')
                    setWebsite(company?.website ?? '')
                    setServices(company?.services ?? '')
                    setDescription(company?.description ?? '')
                  }} className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                    Reset
                  </button>
                  <button type="submit" disabled={savingCompany} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60">
                    {savingCompany ? 'Saving…' : 'Save Company Info'}
                  </button>
                </div>
              </form>
            </Section>

            {/* ── Danger zone ── */}
            <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden mb-8">
              <div className="px-6 py-4 bg-red-50/50 border-b border-red-100 flex items-center justify-between">
                <h3 className="text-base font-semibold text-red-700">Danger Zone</h3>
                <span className="material-symbols-outlined text-red-400">warning</span>
              </div>
              <div className="p-6">
                {!showDeleteConfirm ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Deactivate Account</p>
                      <p className="text-xs text-slate-500 mt-1">Your account will be deactivated and you won't be able to sign in. Contact support to reactivate.</p>
                    </div>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-5 py-2.5 border border-red-400 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-600 hover:text-white transition-all whitespace-nowrap"
                    >
                      Deactivate Account
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-200">
                      <span className="material-symbols-outlined text-red-500 text-[20px] mt-0.5">error</span>
                      <div>
                        <p className="text-sm font-semibold text-red-800">Are you absolutely sure?</p>
                        <p className="text-xs text-red-600 mt-1">This will deactivate your account immediately. You will be signed out and cannot log back in until a DB admin reactivates it.</p>
                      </div>
                    </div>
                    <div className="flex gap-3 justify-end">
                      <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                        Cancel
                      </button>
                      <button onClick={handleDeleteAccount} disabled={deletingAccount} className="px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60">
                        {deletingAccount ? 'Deactivating…' : 'Yes, Deactivate'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>
    </Layout>
  )
}
