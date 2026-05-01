import Layout from '../components/Layout'

const STATS = [
  { label: 'Total Leads',      value: '2,482', icon: 'trending_up',  color: 'bg-indigo-50 text-indigo-600' },
  { label: 'Qualified',        value: '1,120', icon: 'stars',        color: 'bg-blue-50 text-blue-600' },
  { label: 'Avg Response',     value: '1.2m',  icon: 'schedule',     color: 'bg-amber-50 text-amber-600' },
  { label: 'Conversion Rate',  value: '18.4%', icon: 'check_circle', color: 'bg-green-50 text-green-600' },
]

const LEADS = [
  { initials: 'SM', name: 'Sarah Mitchell',  email: 's.mitchell@technova.io',     status: 'Qualified',   statusColor: 'bg-green-50 text-green-700 ring-green-600/20', score: 92, scorePct: '92%', scoreColor: '#22c55e', date: 'Oct 24, 2023' },
  { initials: 'DR', name: 'David Ross',      email: 'david.ross@globalcloud.com', status: 'Nurturing',   statusColor: 'bg-amber-50 text-amber-700 ring-amber-600/20',  score: 65, scorePct: '65%', scoreColor: '#f59e0b', date: 'Oct 23, 2023' },
  { initials: 'AK', name: 'Aisha Khan',      email: 'akhan@vertex.net',           status: 'New',         statusColor: 'bg-slate-100 text-slate-700 ring-slate-200',     score: null, scorePct: '--', scoreColor: '#94a3b8', date: 'Oct 23, 2023' },
  { initials: 'JB', name: 'James Bennett',   email: 'j.bennett@skyline.org',      status: 'Unqualified', statusColor: 'bg-red-50 text-red-700 ring-red-600/20',          score: 24, scorePct: '24%', scoreColor: '#ef4444', date: 'Oct 22, 2023' },
  { initials: 'PL', name: 'Patricia Lee',    email: 'p.lee@quantum-fin.com',      status: 'Qualified',   statusColor: 'bg-green-50 text-green-700 ring-green-600/20', score: 88, scorePct: '88%', scoreColor: '#22c55e', date: 'Oct 22, 2023' },
]

const AVATAR_COLORS = ['bg-indigo-50 text-indigo-700', 'bg-blue-50 text-blue-700', 'bg-slate-100 text-slate-700', 'bg-rose-50 text-rose-700', 'bg-indigo-50 text-indigo-700']

export default function Leads() {
  return (
    <Layout>
      <main className="overflow-y-auto bg-background p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-64px)]">
        <div className="mx-auto max-w-7xl">

          {/* Page header */}
          <div className="sm:flex sm:items-center sm:justify-between mb-8">
            <div>
              <h1 className="text-h1 font-h1 text-slate-900">Leads</h1>
              <p className="mt-2 text-sm text-slate-500">Manage and qualify your inbound AI-generated leads.</p>
            </div>
            <div className="mt-4 flex gap-3 sm:mt-0">
              <button className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 transition-all">
                <span className="material-symbols-outlined text-[18px]">download</span>
                Export CSV
              </button>
              <button className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-all">
                <span className="material-symbols-outlined text-[18px]">add</span>
                Add Lead
              </button>
            </div>
          </div>

          {/* Mini stats bento */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-8">
            {STATS.map(s => (
              <div key={s.label} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className={`p-2 rounded-lg ${s.color}`}>
                  <span className="material-symbols-outlined text-[20px]">{s.icon}</span>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{s.label}</p>
                  <p className="text-2xl font-semibold text-slate-900">{s.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Table card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">

            {/* Toolbar */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg bg-white hover:bg-slate-50">
                  <span className="material-symbols-outlined text-[16px]">filter_list</span>
                  Filter
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg bg-white hover:bg-slate-50">
                  <span className="material-symbols-outlined text-[16px]">sort</span>
                  Sort
                </button>
              </div>
              <p className="text-sm text-slate-500">
                Showing <span className="font-semibold text-slate-900">1–5</span> of 150 leads
              </p>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Score</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {LEADS.map((lead, i) => (
                    <tr key={lead.email} className="hover:bg-slate-50/50 transition-colors">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold ${AVATAR_COLORS[i]}`}>
                            {lead.initials}
                          </div>
                          <span className="text-sm font-medium text-slate-900">{lead.name}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">{lead.email}</td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${lead.statusColor}`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <span className="text-sm text-slate-900 tabular-nums">
                            {lead.score != null ? `${lead.score}/100` : '—'}
                          </span>
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: lead.score != null ? `${lead.score}%` : '0%', background: lead.scoreColor }} />
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">{lead.date}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <button className="text-sm font-semibold text-indigo-600 hover:underline underline-offset-4 decoration-2">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
              <div className="flex gap-2">
                <button disabled className="p-2 border border-slate-200 rounded-lg bg-white disabled:opacity-40">
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                {[1, 2, 3].map(n => (
                  <button key={n} className={`px-3 py-1 border rounded-lg text-sm ${n === 1 ? 'border-indigo-600 text-indigo-600 bg-white font-semibold' : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'}`}>
                    {n}
                  </button>
                ))}
                <button className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50">
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
              <p className="text-sm text-slate-500">Page 1 of 15</p>
            </div>
          </div>

        </div>
      </main>
    </Layout>
  )
}
