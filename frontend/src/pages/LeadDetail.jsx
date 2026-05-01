import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import Toast from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../hooks/useToast'
import { getLeadDetail, updateLeadStatus, updateLeadNotes } from '../services/api'

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  new:         { label: 'New',         badge: 'bg-slate-100 text-slate-700 ring-slate-200' },
  contacted:   { label: 'Contacted',   badge: 'bg-blue-50 text-blue-700 ring-blue-200' },
  qualified:   { label: 'Qualified',   badge: 'bg-green-50 text-green-700 ring-green-200' },
  unqualified: { label: 'Unqualified', badge: 'bg-red-50 text-red-600 ring-red-200' },
  closed:      { label: 'Closed',      badge: 'bg-slate-200 text-slate-500 ring-slate-300' },
}

const TAG_CONFIG = {
  hot:  { label: 'Hot',  color: '#ef4444', bg: '#fef2f2', text: '#b91c1c' },
  warm: { label: 'Warm', color: '#f59e0b', bg: '#fffbeb', text: '#b45309' },
  cold: { label: 'Cold', color: '#94a3b8', bg: '#f1f5f9', text: '#475569' },
}

const SCORE_COLOR = s => s >= 70 ? '#22c55e' : s >= 40 ? '#f59e0b' : '#ef4444'

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function initials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

// ── Conversation thread ────────────────────────────────────────────────────────

function ConversationBlock({ conv, index }) {
  const [open, setOpen] = useState(index === 0)
  const msgs = conv.messages || []

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(s => !s)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-slate-50/70 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
            <span className="material-symbols-outlined text-indigo-600 text-[18px]">forum</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Conversation #{conv.id}</p>
            <p className="text-xs text-slate-400">{fmtDate(conv.created_at)} · {msgs.length} messages</p>
          </div>
        </div>
        <span className={`material-symbols-outlined text-slate-400 text-[20px] transition-transform ${open ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-100">
          {/* AI Summary */}
          {conv.summary && (
            <div className="px-5 py-4 bg-indigo-50/50 border-b border-indigo-100">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="material-symbols-outlined text-indigo-500 text-[16px]">auto_awesome</span>
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">AI Summary</p>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{conv.summary}</p>
            </div>
          )}

          {/* Messages */}
          <div className="p-4 flex flex-col gap-3" style={{ background: '#f7f3ee' }}>
            {msgs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No messages recorded.</p>
            ) : msgs.map(msg => {
              const isAgent = msg.sender_type === 'user'
              return (
                <div key={msg.id} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-[78%] px-4 py-3 rounded-xl shadow-sm text-sm leading-relaxed"
                    style={{
                      background: isAgent ? '#4f46e5' : '#ffffff',
                      color: isAgent ? '#ffffff' : '#1e293b',
                      borderRadius: isAgent ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      border: isAgent ? 'none' : '1px solid #e2e8f0',
                    }}
                  >
                    <p className="text-xs font-semibold mb-1 opacity-60">
                      {isAgent ? 'AI Agent' : 'Client'}
                    </p>
                    <p>{msg.content}</p>
                    <p className="text-[11px] mt-1.5 opacity-50 text-right">{fmtTime(msg.created_at)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Info row helper ────────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <span className="material-symbols-outlined text-slate-400 text-[18px] mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm text-slate-800 mt-0.5 break-words">{value}</p>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function LeadDetail() {
  const { leadId } = useParams()
  const navigate = useNavigate()
  const { firebaseUser } = useAuth()
  const { toast, showToast, hideToast } = useToast()

  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [notes, setNotes]       = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  useEffect(() => {
    if (!firebaseUser) return
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        const token = await firebaseUser.getIdToken()
        const result = await getLeadDetail(token, leadId)
        if (!cancelled) {
          setData(result)
          setNotes(result.lead.notes || '')
        }
      } catch (err) {
        if (!cancelled) showToast('Failed to load lead')
        console.error(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [firebaseUser, leadId]) // eslint-disable-line

  async function handleStatusChange(newStatus) {
    if (!firebaseUser || !data) return
    try {
      const token = await firebaseUser.getIdToken()
      await updateLeadStatus(token, leadId, newStatus)
      setData(prev => ({ ...prev, lead: { ...prev.lead, status: newStatus } }))
    } catch {
      showToast('Failed to update status')
    }
  }

  async function handleSaveNotes() {
    if (!firebaseUser || !data) return
    setSavingNotes(true)
    try {
      const token = await firebaseUser.getIdToken()
      await updateLeadNotes(token, leadId, notes)
      setData(prev => ({ ...prev, lead: { ...prev.lead, notes } }))
      showToast('Notes saved')
    } catch {
      showToast('Failed to save notes')
    } finally {
      setSavingNotes(false)
    }
  }

  // ── Loading ──
  if (loading) {
    return (
      <Layout>
        <Toast toast={toast} onClose={hideToast} />
        <main className="flex items-center justify-center min-h-screen bg-slate-50">
          <div className="text-center">
            <span className="material-symbols-outlined text-indigo-500 text-[40px] block mb-3 animate-spin">hourglass_top</span>
            <p className="text-slate-500 text-sm">Loading lead…</p>
          </div>
        </main>
      </Layout>
    )
  }

  if (!data) {
    return (
      <Layout>
        <main className="flex items-center justify-center min-h-screen bg-slate-50">
          <div className="text-center">
            <span className="material-symbols-outlined text-red-400 text-[40px] block mb-3">error</span>
            <p className="text-slate-600 font-medium">Lead not found</p>
            <button onClick={() => navigate('/leads')} className="mt-4 text-sm text-indigo-600 font-semibold hover:underline">
              ← Back to Leads
            </button>
          </div>
        </main>
      </Layout>
    )
  }

  const { lead, client, conversations } = data
  const tagCfg   = lead.tag ? TAG_CONFIG[lead.tag] : null
  const statusCfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new

  return (
    <Layout>
      <Toast toast={toast} onClose={hideToast} />
      <main className="bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl">

          {/* Breadcrumb */}
          <button
            onClick={() => navigate('/leads')}
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 transition-colors mb-6 font-medium"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Leads
          </button>

          {/* ── Lead header card ── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              {/* Left: identity */}
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-lg font-bold text-indigo-700 shrink-0">
                  {initials(lead.name)}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">{lead.name || 'Unknown Client'}</h1>
                  <div className="flex flex-wrap gap-3 mt-1.5">
                    {lead.email && (
                      <span className="flex items-center gap-1 text-sm text-slate-500">
                        <span className="material-symbols-outlined text-[16px]">mail</span>
                        {lead.email}
                      </span>
                    )}
                    {lead.phone_number && (
                      <span className="flex items-center gap-1 text-sm text-slate-500">
                        <span className="material-symbols-outlined text-[16px]">phone</span>
                        {lead.phone_number}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-sm text-slate-400">
                      <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                      {fmtDate(lead.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: status + tag + score */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Status selector */}
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Status</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {Object.entries(STATUS_CONFIG).map(([key, s]) => (
                      <button
                        key={key}
                        onClick={() => handleStatusChange(key)}
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset transition-all ${s.badge} ${lead.status === key ? 'ring-2 scale-105' : 'opacity-50 hover:opacity-80'}`}
                      >
                        {lead.status === key && <span className="material-symbols-outlined text-[12px] mr-1">check</span>}
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI Tag */}
                {tagCfg && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">AI Tag</p>
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
                      style={{ background: tagCfg.bg, color: tagCfg.text }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background: tagCfg.color }} />
                      {tagCfg.label}
                    </span>
                  </div>
                )}

                {/* Score */}
                {lead.score != null && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">AI Score</p>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold" style={{ color: SCORE_COLOR(lead.score) }}>
                        {lead.score}
                      </span>
                      <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${lead.score}%`, background: SCORE_COLOR(lead.score) }} />
                      </div>
                      <span className="text-xs text-slate-400">/100</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Requirement */}
            {lead.requirement && (
              <div className="mt-5 pt-5 border-t border-slate-100">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Requirement</p>
                <p className="text-slate-800 leading-relaxed">{lead.requirement}</p>
              </div>
            )}
          </div>

          {/* ── Two-column body ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left — conversations */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">
                  Conversations
                  <span className="ml-2 text-sm font-normal text-slate-400">({conversations.length})</span>
                </h2>
              </div>

              {conversations.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 px-6 py-12 text-center">
                  <span className="material-symbols-outlined text-slate-300 text-[40px] block mb-2">forum</span>
                  <p className="text-sm text-slate-400">No conversations linked to this lead yet.</p>
                </div>
              ) : (
                conversations.map((conv, i) => (
                  <ConversationBlock key={conv.id} conv={conv} index={i} />
                ))
              )}

              {/* Notes */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-slate-400 text-[18px]">edit_note</span>
                  <h3 className="text-sm font-semibold text-slate-900">Notes</h3>
                </div>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add internal notes about this lead…"
                  rows={4}
                  className="w-full text-sm text-slate-700 border border-slate-200 rounded-xl px-4 py-3 resize-none outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {savingNotes ? 'Saving…' : 'Save notes'}
                  </button>
                </div>
              </div>
            </div>

            {/* Right sidebar */}
            <div className="flex flex-col gap-4">

              {/* Client */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-slate-400 text-[18px]">person</span>
                  <h3 className="text-sm font-semibold text-slate-900">Client</h3>
                </div>
                {client ? (
                  <>
                    <InfoRow icon="badge"       label="Name"         value={client.name} />
                    <InfoRow icon="phone"        label="Phone"        value={client.phone_number} />
                    <InfoRow icon="calendar_today" label="First contact" value={fmtDate(client.created_at)} />
                  </>
                ) : (
                  <p className="text-xs text-slate-400">Client data unavailable.</p>
                )}
              </div>

              {/* Qualification data */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-slate-400 text-[18px]">checklist</span>
                  <h3 className="text-sm font-semibold text-slate-900">Qualification</h3>
                </div>
                <InfoRow icon="payments"       label="Budget"    value={lead.budget} />
                <InfoRow icon="schedule"       label="Timeline"  value={lead.timeline} />
                <InfoRow icon="location_on"    label="Location"  value={lead.location} />
                {!lead.budget && !lead.timeline && !lead.location && (
                  <p className="text-xs text-slate-400 py-1">No qualification data captured yet.</p>
                )}
              </div>

              {/* Metadata */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-slate-400 text-[18px]">info</span>
                  <h3 className="text-sm font-semibold text-slate-900">Details</h3>
                </div>
                <InfoRow icon="tag"              label="Lead ID"  value={`#${lead.id}`} />
                <InfoRow icon="cell_tower"       label="Source"   value={lead.source} />
                <InfoRow icon="calendar_today"   label="Created"  value={fmtDate(lead.created_at)} />
                <InfoRow icon="update"           label="Updated"  value={fmtDate(lead.updated_at)} />
              </div>

              {/* Raw input */}
              {lead.raw_input && (
                <details className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <summary className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-500 select-none">
                    <span className="material-symbols-outlined text-[18px]">code</span>
                    Raw client input
                  </summary>
                  <p className="mt-3 text-xs text-slate-500 leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-xl p-3 border border-slate-100">
                    {lead.raw_input}
                  </p>
                </details>
              )}
            </div>

          </div>
        </div>
      </main>
    </Layout>
  )
}
