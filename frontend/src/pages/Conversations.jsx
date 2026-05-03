import { useState, useEffect, useRef, useCallback } from 'react'
import Layout from '../components/Layout'
import Toast from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../hooks/useToast'
import { getConversations, getConversation } from '../services/api'

// ── Helpers ────────────────────────────────────────────────────────────────────

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m`
  if (h < 24) return `${h}h`
  if (d === 1) return 'Yesterday'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function fmtDateLabel(iso) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function initials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function groupByDate(msgs) {
  const groups = []
  let currentKey = null
  for (const msg of msgs) {
    const key = new Date(msg.created_at).toDateString()
    if (key !== currentKey) {
      currentKey = key
      groups.push({ dateIso: msg.created_at, messages: [] })
    }
    groups[groups.length - 1].messages.push(msg)
  }
  return groups
}

const AVATAR_PALETTE = [
  'bg-indigo-100 text-indigo-700', 'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700', 'bg-teal-100 text-teal-700',
  'bg-rose-100 text-rose-700',     'bg-amber-100 text-amber-700',
]

// ── Page ───────────────────────────────────────────────────────────────────────

export default function Conversations() {
  const { firebaseUser } = useAuth()
  const { toast, showToast, hideToast } = useToast()

  // List state
  const [convList,     setConvList]     = useState([])
  const [total,        setTotal]        = useState(0)
  const [listLoading,  setListLoading]  = useState(true)
  const [search,       setSearch]       = useState('')
  const [page,         setPage]         = useState(1)
  const perPage = 30

  // Detail state
  const [activeConv,  setActiveConv]  = useState(null)
  const [messages,    setMessages]    = useState([])
  const [msgLoading,  setMsgLoading]  = useState(false)

  // Mobile: toggle between list and chat
  const [showChat, setShowChat] = useState(false)

  const messagesEndRef = useRef(null)

  // ── Load list ──────────────────────────────────────────────────────────────

  const fetchList = useCallback(async (pg, q) => {
    if (!firebaseUser) return
    setListLoading(true)
    try {
      const token = await firebaseUser.getIdToken()
      const data  = await getConversations(token, { page: pg, perPage, search: q || undefined })
      setConvList(data.conversations)
      setTotal(data.total)
    } catch {
      showToast('Failed to load conversations.')
    } finally {
      setListLoading(false)
    }
  }, [firebaseUser]) // eslint-disable-line

  useEffect(() => { fetchList(1, '') }, [firebaseUser]) // eslint-disable-line

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchList(1, search) }, 350)
    return () => clearTimeout(t)
  }, [search]) // eslint-disable-line

  // Scroll to bottom when messages load
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Select conversation ────────────────────────────────────────────────────

  async function handleSelect(conv) {
    setActiveConv(conv)
    setMessages([])
    setShowChat(true)
    setMsgLoading(true)
    try {
      const token = await firebaseUser.getIdToken()
      const data  = await getConversation(token, conv.id)
      setMessages(data.messages)
      // Merge in full details (summary, phone)
      setActiveConv(prev => ({
        ...prev,
        conversation_summary: data.conversation_summary,
        client_phone:         data.client_phone,
      }))
    } catch {
      showToast('Failed to load messages.')
    } finally {
      setMsgLoading(false)
    }
  }

  const pages        = Math.max(1, Math.ceil(total / perPage))
  const messageGroups = groupByDate(messages)

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Layout>
      <Toast toast={toast} onClose={hideToast} />
      <div className="flex h-[calc(100vh-64px)] bg-slate-50 overflow-hidden">

        {/* ── Conversation list panel ── */}
        <div className={`${showChat ? 'hidden sm:flex' : 'flex'} w-full sm:w-80 shrink-0 flex-col border-r border-slate-200 bg-white`}>

          {/* List header */}
          <div className="p-4 border-b border-slate-100 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-slate-900">Conversations</h2>
              {!listLoading && (
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full tabular-nums">{total}</span>
              )}
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none">search</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
                placeholder="Search by client name…"
              />
            </div>
          </div>

          {/* List body */}
          <div className="flex-1 overflow-y-auto">
            {listLoading ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2">
                <span className="material-symbols-outlined text-slate-300 text-[32px] animate-spin">hourglass_top</span>
                <p className="text-xs text-slate-400">Loading…</p>
              </div>
            ) : convList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 px-6 text-center">
                <span className="material-symbols-outlined text-slate-300 text-[32px]">forum</span>
                <p className="text-sm text-slate-400">
                  {search ? 'No results found' : 'No conversations yet'}
                </p>
              </div>
            ) : (
              convList.map((conv, i) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelect(conv)}
                  className={`w-full text-left px-4 py-3.5 border-b border-slate-50 flex items-start gap-3 transition-colors ${
                    activeConv?.id === conv.id
                      ? 'bg-indigo-50 border-l-[3px] border-l-indigo-500'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${AVATAR_PALETTE[i % AVATAR_PALETTE.length]}`}>
                    {initials(conv.client_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-semibold text-slate-900 truncate">{conv.client_name}</span>
                      <span className="text-[10px] text-slate-400 ml-2 shrink-0">{relativeTime(conv.last_message_time)}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate leading-snug">{conv.last_message || '—'}</p>
                    <p className="text-[10px] text-slate-300 mt-0.5">{conv.message_count} message{conv.message_count !== 1 ? 's' : ''}</p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 p-3 border-t border-slate-100 shrink-0">
              <button
                onClick={() => { const p = Math.max(1, page - 1); setPage(p); fetchList(p, search) }}
                disabled={page === 1}
                className="p-1.5 border border-slate-200 rounded-lg bg-white disabled:opacity-40 text-slate-500 hover:bg-slate-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
              </button>
              <span className="text-xs text-slate-400 tabular-nums">{page} / {pages}</span>
              <button
                onClick={() => { const p = Math.min(pages, page + 1); setPage(p); fetchList(p, search) }}
                disabled={page === pages}
                className="p-1.5 border border-slate-200 rounded-lg bg-white disabled:opacity-40 text-slate-500 hover:bg-slate-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          )}
        </div>

        {/* ── Chat panel ── */}
        <div className={`${showChat ? 'flex' : 'hidden sm:flex'} flex-1 flex-col min-w-0 overflow-hidden`}>

          {!activeConv ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-slate-50/80">
              <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                <span className="material-symbols-outlined text-slate-300 text-[32px]">forum</span>
              </div>
              <p className="text-base font-semibold text-slate-600">Select a conversation</p>
              <p className="text-sm text-slate-400 text-center w-64">
                Choose a conversation from the list to view its full message history.
              </p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center gap-3 shrink-0">
                <button
                  onClick={() => { setShowChat(false); setActiveConv(null) }}
                  className="sm:hidden p-1.5 -ml-1 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>
                <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${AVATAR_PALETTE[0]}`}>
                  {initials(activeConv.client_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{activeConv.client_name}</p>
                  {activeConv.client_phone && (
                    <p className="text-xs text-slate-400">{activeConv.client_phone}</p>
                  )}
                </div>
                <div className="shrink-0 flex items-center gap-1 text-xs text-slate-400">
                  <span className="material-symbols-outlined text-[14px]">chat_bubble_outline</span>
                  <span className="tabular-nums">{activeConv.message_count}</span>
                </div>
              </div>

              {/* Summary banner */}
              {activeConv.conversation_summary && (
                <div className="bg-amber-50 border-b border-amber-100 px-4 sm:px-6 py-2.5 flex items-start gap-2 shrink-0">
                  <span className="material-symbols-outlined text-amber-400 text-[16px] mt-0.5 shrink-0">summarize</span>
                  <p className="text-xs text-amber-800 leading-relaxed">{activeConv.conversation_summary}</p>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 bg-slate-50/60">
                {msgLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-slate-300 text-[40px] animate-spin">hourglass_top</span>
                  </div>
                ) : messageGroups.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-sm text-slate-400">No messages in this conversation.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {messageGroups.map((group, gi) => (
                      <div key={gi}>
                        {/* Date separator */}
                        <div className="flex items-center gap-3 my-4">
                          <div className="flex-1 h-px bg-slate-200" />
                          <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap px-1">
                            {fmtDateLabel(group.dateIso)}
                          </span>
                          <div className="flex-1 h-px bg-slate-200" />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          {group.messages.map((msg, mi) => {
                            const isAgent = msg.sender_type === 'user'
                            const prevMsg = mi > 0 ? group.messages[mi - 1] : null
                            const isSameSender = prevMsg?.sender_type === msg.sender_type
                            return (
                              <div key={msg.id} className={`flex ${isAgent ? 'justify-end' : 'justify-start'} ${isSameSender ? 'mt-0.5' : 'mt-3'}`}>
                                <div className={`max-w-[75%] sm:max-w-[65%] ${isAgent ? 'items-end' : 'items-start'} flex flex-col`}>
                                  {/* Sender label on first message or after switching sender */}
                                  {!isSameSender && (
                                    <p className={`text-[10px] font-semibold mb-1 px-1 ${isAgent ? 'text-right text-indigo-400' : 'text-slate-400'}`}>
                                      {isAgent ? 'AI Agent' : activeConv.client_name}
                                    </p>
                                  )}
                                  <div
                                    className={`px-4 py-2.5 shadow-sm ${
                                      isAgent
                                        ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm'
                                        : 'bg-white text-slate-800 rounded-2xl rounded-tl-sm border border-slate-200'
                                    }`}
                                  >
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                    <p className={`text-[10px] mt-1.5 text-right ${isAgent ? 'text-indigo-200' : 'text-slate-400'}`}>
                                      {fmtTime(msg.created_at)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Read-only footer */}
              <div className="bg-white border-t border-slate-100 px-4 py-3 flex items-center justify-center gap-2 shrink-0">
                <span className="material-symbols-outlined text-slate-300 text-[15px]">lock</span>
                <p className="text-xs text-slate-400">Read-only — conversation handled by the AI agent</p>
              </div>
            </>
          )}
        </div>

      </div>
    </Layout>
  )
}
