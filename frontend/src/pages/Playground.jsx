import { useState, useEffect, useRef, useCallback } from 'react'
import Layout from '../components/Layout'
import Toast from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../hooks/useToast'
import {
  getPlaygroundSessions,
  sendPlaygroundMessage,
  getPlaygroundConversation,
  deletePlaygroundSession,
} from '../services/api'

// ── Helpers ────────────────────────────────────────────────────────────────────

let _tabSeq = 0
function newTabId() { return `tab_${++_tabSeq}` }

function clientLabel(name) {
  if (!name) return 'Client'
  const m = name.match(/playground_client_(\d+)/)
  if (m) return `Client ${m[1]}`
  // legacy: playground_test_*
  if (name.startsWith('playground')) return 'Client 1'
  return name
}

function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ── Chat window ────────────────────────────────────────────────────────────────

function ChatWindow({ tab, onSend, sending }) {
  const bottomRef = useRef(null)
  const msgs = tab?.messages ?? []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, sending])

  if (!tab) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: '#efeae2' }}>
        <div className="text-center">
          <span className="material-symbols-outlined text-slate-400 text-[48px] block mb-3">add_circle</span>
          <p className="text-sm font-medium text-slate-500">No client selected</p>
          <p className="text-xs text-slate-400 mt-1">Click "New Client" to start a test session.</p>
        </div>
      </div>
    )
  }

  if (tab.loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: '#efeae2' }}>
        <span className="material-symbols-outlined text-slate-400 text-[36px] animate-spin">hourglass_top</span>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3" style={{ background: '#efeae2' }}>
      {msgs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <span className="material-symbols-outlined text-slate-400 text-[48px] block mb-3">forum</span>
            <p className="text-sm font-medium text-slate-500">
              {tab.clientId ? 'No messages yet in this session' : 'Start a conversation'}
            </p>
            <p className="text-xs text-slate-400 mt-1">Type a message below to test your AI agent.</p>
          </div>
        </div>
      ) : (
        msgs.map((msg, i) => {
          const isAgent = msg.from === 'ai'
          return (
            <div key={i} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-[76%] px-4 py-3 text-sm leading-relaxed shadow-sm"
                style={{
                  background:   isAgent ? '#4f46e5' : '#ffffff',
                  color:        isAgent ? '#ffffff' : '#1e293b',
                  borderRadius: isAgent ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  border:       isAgent ? 'none' : '1px solid #e2e8f0',
                }}
              >
                <p className="text-[10px] font-semibold mb-1 opacity-50">
                  {isAgent ? 'AI Agent' : 'You (as client)'}
                </p>
                <p>{msg.text}</p>
                <p className="text-[11px] mt-1 text-right opacity-40">{msg.time}</p>
              </div>
            </div>
          )
        })
      )}

      {sending && tab.active && (
        <div className="flex justify-end">
          <div className="px-4 py-3 rounded-[18px] rounded-tr-[4px] shadow-sm" style={{ background: '#4f46e5' }}>
            <div className="flex gap-1 items-center">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.6)', animation: 'bounce 1s infinite', animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function Playground() {
  const { firebaseUser } = useAuth()
  const { toast, showToast, hideToast } = useToast()

  // tabs: { tabId, clientId, label, messages, conversationId, msgCount, loading, active }
  const [tabs, setTabs]           = useState([])
  const [activeTabId, setActiveTabId] = useState(null)
  const [input, setInput]         = useState('')
  const [sending, setSending]     = useState(false)
  const [booting, setBooting]     = useState(true)

  const activeTab = tabs.find(t => t.tabId === activeTabId) ?? null

  // ── Load sessions on mount ──────────────────────────────────────────────────
  const loadSessions = useCallback(async () => {
    if (!firebaseUser) return
    try {
      const token = await firebaseUser.getIdToken()
      const { sessions } = await getPlaygroundSessions(token)

      if (sessions.length === 0) {
        // No existing sessions → add one blank "New Client" tab
        const blank = makeBlankTab()
        setTabs([blank])
        setActiveTabId(blank.tabId)
      } else {
        const built = sessions.map(s => ({
          tabId:          `session_${s.client_id}`,
          clientId:       s.client_id,
          label:          clientLabel(s.client_name),
          messages:       null,           // lazy-load when tab is opened
          conversationId: s.conversation_id,
          msgCount:       s.message_count,
          loading:        false,
        }))
        setTabs(built)
        setActiveTabId(built[built.length - 1].tabId)  // open most recent
      }
    } catch (err) {
      showToast('Failed to load sessions')
      console.error(err)
    } finally {
      setBooting(false)
    }
  }, [firebaseUser]) // eslint-disable-line

  useEffect(() => { loadSessions() }, [loadSessions])

  // ── Lazy-load messages when switching to a tab ──────────────────────────────
  useEffect(() => {
    if (!activeTab || !firebaseUser) return
    if (activeTab.messages !== null) return          // already loaded
    if (!activeTab.conversationId) return            // new blank tab — nothing to load

    setTabs(prev => prev.map(t =>
      t.tabId === activeTabId ? { ...t, loading: true } : t
    ))

    firebaseUser.getIdToken().then(token =>
      getPlaygroundConversation(token, activeTab.conversationId)
    ).then(data => {
      const msgs = (data.messages || []).map(m => ({
        from: m.sender_type === 'user' ? 'ai' : 'user',
        text: m.content,
        time: fmtTime(m.created_at),
      }))
      setTabs(prev => prev.map(t =>
        t.tabId === activeTabId ? { ...t, messages: msgs, loading: false } : t
      ))
    }).catch(() => {
      setTabs(prev => prev.map(t =>
        t.tabId === activeTabId ? { ...t, messages: [], loading: false } : t
      ))
    })
  }, [activeTabId]) // eslint-disable-line

  // ── Tab management ──────────────────────────────────────────────────────────

  function makeBlankTab() {
    return {
      tabId:          newTabId(),
      clientId:       null,
      label:          'New Client',
      messages:       [],
      conversationId: null,
      msgCount:       0,
      loading:        false,
    }
  }

  function addNewTab() {
    const blank = makeBlankTab()
    setTabs(prev => [...prev, blank])
    setActiveTabId(blank.tabId)
    setInput('')
  }

  async function closeTab(tabId) {
    const tab = tabs.find(t => t.tabId === tabId)
    if (!tab) return

    // Delete from backend if it has a real client
    if (tab.clientId && firebaseUser) {
      try {
        const token = await firebaseUser.getIdToken()
        await deletePlaygroundSession(token, tab.clientId)
      } catch { /* best-effort */ }
    }

    setTabs(prev => {
      const next = prev.filter(t => t.tabId !== tabId)
      if (activeTabId === tabId && next.length > 0) {
        setActiveTabId(next[next.length - 1].tabId)
      } else if (next.length === 0) {
        const blank = makeBlankTab()
        setActiveTabId(blank.tabId)
        return [blank]
      }
      return next
    })
  }

  // ── Send message ────────────────────────────────────────────────────────────

  async function handleSend() {
    const text = input.trim()
    if (!text || !firebaseUser || !activeTab || sending) return

    setSending(true)
    setInput('')

    const userMsg = {
      from: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    // Optimistically append user message
    setTabs(prev => prev.map(t =>
      t.tabId === activeTabId
        ? { ...t, messages: [...(t.messages || []), userMsg] }
        : t
    ))

    try {
      const token    = await firebaseUser.getIdToken()
      const response = await sendPlaygroundMessage(token, {
        content:  text,
        clientId: activeTab.clientId ?? undefined,
      })

      const aiMsg = {
        from: 'ai',
        text: response.reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setTabs(prev => prev.map(t => {
        if (t.tabId !== activeTabId) return t
        // If this was a blank tab, now we have a real clientId
        const isNewClient = !t.clientId
        return {
          ...t,
          clientId:       response.client_id,
          conversationId: response.conversation_id,
          label:          isNewClient ? clientLabel(`playground_client_${response.client_id}`) : t.label,
          messages:       [...(t.messages || []), aiMsg],
          msgCount:       (t.msgCount || 0) + 1,
        }
      }))
    } catch (err) {
      showToast('Failed to send — is the backend running?')
      console.error(err)
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (booting) {
    return (
      <Layout>
        <Toast toast={toast} onClose={hideToast} />
        <main className="flex items-center justify-center min-h-screen bg-slate-50">
          <span className="material-symbols-outlined text-indigo-400 text-[40px] animate-spin">hourglass_top</span>
        </main>
      </Layout>
    )
  }

  return (
    <Layout>
      <Toast toast={toast} onClose={hideToast} />
      <main className="bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl">

          {/* Header */}
          <div className="mb-5">
            <h1 className="text-2xl font-bold text-slate-900">Playground</h1>
            <p className="mt-1 text-sm text-slate-500">
              Test your AI agent as multiple independent clients. Each tab is a separate test persona.
            </p>
          </div>

          {/* ── Chat card ── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col" style={{ height: 640 }}>

            {/* Tabs bar */}
            <div className="flex items-center gap-1 px-3 pt-3 pb-0 border-b border-slate-200 overflow-x-auto bg-slate-50/60 flex-shrink-0">
              {tabs.map(tab => (
                <div
                  key={tab.tabId}
                  onClick={() => { setActiveTabId(tab.tabId); setInput('') }}
                  className={`group flex items-center gap-2 px-3.5 py-2.5 rounded-t-xl text-sm font-medium cursor-pointer transition-all flex-shrink-0 border border-b-0 ${
                    tab.tabId === activeTabId
                      ? 'bg-white text-slate-900 border-slate-200 -mb-px'
                      : 'bg-transparent text-slate-500 border-transparent hover:bg-slate-100/80 hover:text-slate-700'
                  }`}
                >
                  {/* Status dot — green if has messages, gray if empty */}
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: (tab.msgCount || 0) > 0 ? '#22c55e' : '#94a3b8' }}
                  />
                  <span>{tab.label}</span>
                  {(tab.msgCount || 0) > 0 && (
                    <span className="text-[11px] text-slate-400 font-normal">
                      {tab.msgCount}
                    </span>
                  )}
                  {/* Close button */}
                  <button
                    onClick={e => { e.stopPropagation(); closeTab(tab.tabId) }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 hover:text-red-500 rounded"
                    title="Close tab"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              ))}

              {/* New Client button */}
              <button
                onClick={addNewTab}
                className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-t-xl transition-colors flex-shrink-0 ml-1"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                New Client
              </button>
            </div>

            {/* Chat area */}
            <ChatWindow
              tab={activeTab ? { ...activeTab, active: true } : null}
              sending={sending}
            />

            {/* Input */}
            <div className="border-t border-slate-200 bg-white p-4 flex gap-2 flex-shrink-0">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  activeTab?.clientId
                    ? `Continue as ${activeTab.label}…`
                    : 'Type a message as a new test client…'
                }
                disabled={sending || !activeTab}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 disabled:opacity-50 transition-all"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending || !activeTab}
                className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-[20px]">send</span>
              </button>
            </div>

          </div>

          {/* Session count hint */}
          {tabs.filter(t => t.clientId).length > 0 && (
            <p className="mt-3 text-xs text-slate-400 text-center">
              {tabs.filter(t => t.clientId).length} test client{tabs.filter(t => t.clientId).length > 1 ? 's' : ''} · each runs through a separate conversation context · closing a tab deletes the session
            </p>
          )}

        </div>
      </main>
    </Layout>
  )
}
