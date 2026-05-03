import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import Toast from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../hooks/useToast'
import { getLeads, updateLeadStatus } from '../services/api'

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  new:          { label: 'New',          badge: 'bg-slate-100 text-slate-700 ring-slate-200' },
  contacted:    { label: 'Contacted',    badge: 'bg-blue-50 text-blue-700 ring-blue-200' },
  qualified:    { label: 'Qualified',    badge: 'bg-green-50 text-green-700 ring-green-200' },
  unqualified:  { label: 'Unqualified',  badge: 'bg-red-50 text-red-600 ring-red-200' },
  closed:       { label: 'Closed',       badge: 'bg-slate-200 text-slate-500 ring-slate-300' },
}

const TAG_CONFIG = {
  hot:  { label: 'Hot',  dot: '#ef4444' },
  warm: { label: 'Warm', dot: '#f59e0b' },
  cold: { label: 'Cold', dot: '#94a3b8' },
}

const SCORE_COLOR = score =>
  score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444'

const AVATAR_PALETTE = [
  'bg-indigo-50 text-indigo-700', 'bg-blue-50 text-blue-700',
  'bg-purple-50 text-purple-700', 'bg-teal-50 text-teal-700',
  'bg-rose-50 text-rose-700',     'bg-amber-50 text-amber-700',
]

function initials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Inline status dropdown ─────────────────────────────────────────────────────

function StatusSelect({ leadId, value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const cfg = STATUS_CONFIG[value] || STATUS_CONFIG.new

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(s => !s)}
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset transition-opacity hover:opacity-80 ${cfg.badge}`}
      >
        {cfg.label}
        <span className="material-symbols-outlined text-[13px]">unfold_more</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50,
          minWidth: 148, background: '#fff', border: '1px solid #e2e8f0',
          borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.10)', overflow: 'hidden',
        }}>
          {Object.entries(STATUS_CONFIG).map(([key, s]) => (
            <button
              key={key}
              onClick={() => { onChange(leadId, key); setOpen(false) }}
              style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '8px 12px', gap: 8, background: key === value ? '#f8fafc' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              className="hover:bg-slate-50 text-sm text-slate-700"
            >
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${s.badge}`}>{s.label}</span>
              {key === value && <span className="material-symbols-outlined text-indigo-600 text-[16px] ml-auto">check</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function Leads() {
  const { firebaseUser } = useAuth()
  const navigate = useNavigate()
  const { toast, showToast, hideToast } = useToast()

  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(1)
  const [search, setSearch]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterTag, setFilterTag]       = useState('')

  const perPage = 20

  const fetchLeads = useCallback(async (pg = page) => {
    if (!firebaseUser) return
    try {
      setLoading(true)
      const token = await firebaseUser.getIdToken()
      const result = await getLeads(token, {
        page: pg,
        perPage,
        status: filterStatus || undefined,
        tag:    filterTag    || undefined,
        search: search       || undefined,
      })
      setData(result)
    } catch (err) {
      showToast('Failed to load leads')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [firebaseUser, page, filterStatus, filterTag, search]) // eslint-disable-line

  useEffect(() => {
    fetchLeads(page)
  }, [firebaseUser, page, filterStatus, filterTag]) // eslint-disable-line

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchLeads(1) }, 350)
    return () => clearTimeout(t)
  }, [search]) // eslint-disable-line

  async function handleStatusChange(leadId, newStatus) {
    if (!firebaseUser) return
    try {
      const token = await firebaseUser.getIdToken()
      await updateLeadStatus(token, leadId, newStatus)
      setData(prev => prev ? {
        ...prev,
        leads: prev.leads.map(l => l.id === leadId ? { ...l, status: newStatus } : l),
      } : prev)
    } catch {
      showToast('Failed to update status')
    }
  }

  const stats   = data?.stats
  const leads   = data?.leads || []
  const total   = data?.total || 0
  const pages   = Math.max(1, Math.ceil(total / perPage))

  const STAT_CARDS = stats ? [
    { label: 'Total Leads', value: stats.total,    icon: 'trending_up',  color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Hot',         value: stats.hot,      icon: 'local_fire_department', color: 'bg-red-50 text-red-500' },
    { label: 'Warm',        value: stats.warm,     icon: 'wb_sunny',     color: 'bg-amber-50 text-amber-600' },
    { label: 'Cold',        value: stats.cold,     icon: 'ac_unit',      color: 'bg-blue-50 text-blue-500' },
  ] : []

  return (
    <Layout>
      <Toast toast={toast} onClose={hideToast} />
      <main className="bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">

          {/* Header */}
          <div className="sm:flex sm:items-start sm:justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
              <p className="mt-1 text-sm text-slate-500">AI-generated leads from your WhatsApp conversations.</p>
            </div>
          </div>

          {/* Stat cards */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {STAT_CARDS.map(s => (
                <div key={s.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${s.color}`}>
                    <span className="material-symbols-outlined text-[20px]">{s.icon}</span>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{s.label}</p>
                    <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Table card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

            {/* Toolbar */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-48">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">search</span>
                <input
                  type="text"
                  placeholder="Search name, email, requirement…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
                />
              </div>
              {/* Filter: Status */}
              <select
                value={filterStatus}
                onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
                className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-600 outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
              >
                <option value="">All statuses</option>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              {/* Filter: Tag */}
              <select
                value={filterTag}
                onChange={e => { setFilterTag(e.target.value); setPage(1) }}
                className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-600 outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
              >
                <option value="">All tags</option>
                {Object.entries(TAG_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <p className="ml-auto text-sm text-slate-400 whitespace-nowrap">
                {loading ? 'Loading…' : `${total} lead${total !== 1 ? 's' : ''}`}
              </p>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Requirement</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tag</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Score</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Created</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {loading && leads.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center">
                        <span className="material-symbols-outlined text-slate-300 text-[40px] block mb-2 animate-spin">hourglass_top</span>
                        <p className="text-sm text-slate-400">Loading leads…</p>
                      </td>
                    </tr>
                  ) : leads.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center">
                        <span className="material-symbols-outlined text-slate-300 text-[40px] block mb-2">group</span>
                        <p className="text-sm font-medium text-slate-500">No leads yet</p>
                        <p className="text-xs text-slate-400 mt-1">Leads are generated automatically from your Playground and WhatsApp conversations.</p>
                      </td>
                    </tr>
                  ) : leads.map((lead, i) => {
                    const tagCfg = lead.tag ? TAG_CONFIG[lead.tag] : null
                    return (
                      <tr key={lead.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Client */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${AVATAR_PALETTE[i % AVATAR_PALETTE.length]}`}>
                              {initials(lead.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate max-w-[120px]">{lead.name || 'Unknown'}</p>
                              {lead.email && <p className="text-xs text-slate-400 truncate max-w-[120px]">{lead.email}</p>}
                            </div>
                          </div>
                        </td>
                        {/* Requirement */}
                        <td className="px-4 py-3 max-w-[200px]">
                          <p className="text-sm text-slate-600 line-clamp-2">{lead.requirement || '—'}</p>
                        </td>
                        {/* Status (user-editable) */}
                        <td className="px-4 py-3">
                          <StatusSelect
                            leadId={lead.id}
                            value={lead.status}
                            onChange={handleStatusChange}
                          />
                        </td>
                        {/* AI Tag */}
                        <td className="px-4 py-3">
                          {tagCfg ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 whitespace-nowrap">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: tagCfg.dot }} />
                              {tagCfg.label}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                        {/* Score */}
                        <td className="px-4 py-3 text-right">
                          {lead.score != null ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="text-sm text-slate-700 tabular-nums whitespace-nowrap">{lead.score}/100</span>
                              <div className="w-10 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
                                <div className="h-full rounded-full" style={{ width: `${lead.score}%`, background: SCORE_COLOR(lead.score) }} />
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-300">—</span>
                          )}
                        </td>
                        {/* Date */}
                        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{fmtDate(lead.created_at)}</td>
                        {/* View */}
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => navigate(`/leads/${lead.id}`)}
                            className="inline-flex items-center gap-0.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors whitespace-nowrap"
                          >
                            View
                            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 border border-slate-200 rounded-lg bg-white disabled:opacity-40 hover:bg-slate-50 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>
                  {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
                    const n = Math.max(1, Math.min(pages - 4, page - 2)) + i
                    return (
                      <button
                        key={n}
                        onClick={() => setPage(n)}
                        className={`px-3 py-1 border rounded-lg text-sm transition-colors ${n === page ? 'border-indigo-600 text-indigo-600 bg-white font-semibold' : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'}`}
                      >
                        {n}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setPage(p => Math.min(pages, p + 1))}
                    disabled={page === pages}
                    className="p-2 border border-slate-200 rounded-lg bg-white disabled:opacity-40 hover:bg-slate-50 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
                <p className="text-sm text-slate-400">Page {page} of {pages}</p>
              </div>
            )}
          </div>

        </div>
      </main>
    </Layout>
  )
}
