import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { logOut } from '../services/firebase'
import { useNavigate } from 'react-router-dom'

export default function Settings() {
  const { dbUser } = useAuth()
  const navigate = useNavigate()
  const user = dbUser?.user
  const company = dbUser?.company_info

  async function handleSignOut() {
    await logOut()
    navigate('/', { replace: true })
  }

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <Layout>
      <main className="overflow-y-auto bg-background p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-64px)]">
        <div className="mx-auto max-w-6xl"> {/* slightly wider */}

          {/* Page header */}
          <div className="mb-8">
            <h1 className="text-h1 font-h1 text-slate-900">Profile Settings</h1>
            <p className="mt-2 text-sm text-slate-500">
              Manage your personal information, security, and notification preferences.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

            {/* ── Profile Identity ── */}
            <div className="lg:col-span-12 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-28 bg-gradient-to-r from-indigo-600 to-indigo-800 opacity-10 pointer-events-none" />
              
              <div className="relative flex flex-col sm:flex-row items-center sm:items-end gap-5">
                <div className="relative">
                  <div className="h-28 w-28 rounded-full bg-indigo-600 flex items-center justify-center text-white text-3xl font-black border-4 border-white shadow-lg">
                    {initials}
                  </div>
                  <button className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors">
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                </div>

                <div className="flex-1 text-center sm:text-left sm:mb-1">
                  <h2 className="text-2xl font-bold text-slate-900">
                    {user?.name ?? 'Your Name'}
                  </h2>
                  <p className="text-sm text-slate-500">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* ── Personal Info (FULL WIDTH NOW) ── */}
            <div className="lg:col-span-12 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">
                  Personal Information
                </h3>
                <span className="material-symbols-outlined text-slate-300">badge</span>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Full Name
                    </label>
                    <input
                      defaultValue={user?.name ?? ''}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 bg-white"
                    />
                  </div>

                  {/* Industry (READ ONLY) */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Industry
                    </label>
                    <input
                      defaultValue={user?.industry ?? ''}
                      readOnly
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-100 text-slate-500 cursor-not-allowed"
                    />
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      readOnly
                      defaultValue={user?.phone_number ?? ''}
                      placeholder="+92 300 1234567"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-100 text-slate-500 cursor-not-allowed"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Email Address
                    </label>
                    <input
                      defaultValue={user?.email ?? ''}
                      type="email"
                      readOnly
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-100 text-slate-500 cursor-not-allowed"
                    />
                  </div>

                </div>

                <div className="mt-6 pt-5 border-t border-slate-100 flex justify-end gap-3">
                  <button className="px-5 py-2.5 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                  <button className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
                    Save Changes
                  </button>
                </div>
              </div>
            </div>

            {/* ── Company Info ── */}
            <div className="lg:col-span-12 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">
                  Company Information
                </h3>
                <span className="material-symbols-outlined text-slate-300">business</span>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                  {/* Company Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Company Name
                    </label>
                    <input
                      defaultValue={company?.company_name ?? ''}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 bg-white"
                    />
                  </div>

                  {/* Company Size */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Company Size
                    </label>
                    <select
                      defaultValue={company?.company_size ?? ''}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 bg-white"
                    >
                      <option value="">Select size</option>
                      <option value="1-10">1-10</option>
                      <option value="2-10">2-10</option>
                      <option value="11-50">11-50</option>
                      <option value="51-200">51-200</option>
                      <option value="200+">200+</option>
                    </select>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Location
                    </label>
                    <input
                      defaultValue={company?.location ?? ''}
                      placeholder="City, Country"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 bg-white"
                    />
                  </div>

                  {/* Industry */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Industry
                    </label>
                    <input
                      defaultValue={company?.industry ?? ''}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 bg-white"
                    />
                  </div>

                  {/* Services (FULL WIDTH) */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Services
                    </label>
                    <textarea
                      rows={3}
                      defaultValue={company?.services ?? ''}
                      placeholder="e.g. Web development, AI automation..."
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 bg-white"
                    />
                  </div>

                  {/* Description (FULL WIDTH) */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Company Description
                    </label>
                    <textarea
                      rows={4}
                      defaultValue={company?.description ?? ''}
                      placeholder="Describe your company..."
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 bg-white"
                    />
                  </div>

                </div>
              </div>
            </div>

            {/* ── Danger Zone ── */}
            <div className="lg:col-span-12 bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden mb-8">
              <div className="px-6 py-4 bg-red-50/50 border-b border-red-100 flex items-center justify-between">
                <h3 className="text-base font-semibold text-red-700">Danger Zone</h3>
                <span className="material-symbols-outlined text-red-500">warning</span>
              </div>

              <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Delete Account</p>
                  <p className="text-xs text-slate-500 mt-1">
                    All agent data and lead history will be permanently wiped. This cannot be undone.
                  </p>
                </div>

                <button className="px-5 py-2.5 border border-red-400 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-600 hover:text-white transition-all whitespace-nowrap">
                  Delete Account
                </button>
              </div>
            </div>

          </div>
        </div>
      </main>
    </Layout>
  )
}
