import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'

const MOCK_RESPONSES = [
  "Hello! I'm Nexus, your AI qualification assistant. What brings you here today?",
  "That's great to hear! Could you tell me more about the scale of your business — roughly how many leads do you handle per month?",
  "Excellent. And what's your biggest challenge with qualifying those leads currently?",
  "I understand. Leadcense can help automate that entire process on WhatsApp. Would you like to see a quick demo of how it works?",
  "Perfect! One last question — what's the best way for our team to reach you for a personalized walkthrough?",
]

const DEBUG_STEPS = [
  { status: 'INPUT_RECEIVED', color: 'text-green-500', icon: 'check_circle' },
  { status: 'INTENT_DETECTED', color: 'text-indigo-500', icon: 'search' },
  { status: 'KB_LOOKUP', color: 'text-indigo-500', icon: 'database' },
  { status: 'RESPONSE_GENERATED', color: 'text-green-500', icon: 'send' },
]

export default function Playground() {
  const [messages, setMessages]     = useState([])
  const [input, setInput]           = useState('')
  const [typing, setTyping]         = useState(false)
  const [responseIdx, setResponseIdx] = useState(0)
  const [debugLog, setDebugLog]     = useState([])
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  function addDebugEntry(msg) {
    setDebugLog(prev => [...prev.slice(-8), { text: msg, time: new Date().toLocaleTimeString() }])
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text) return
    setInput('')

    const userMsg = { from: 'user', text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    setMessages(prev => [...prev, userMsg])
    addDebugEntry(`INPUT_RECEIVED: "${text.slice(0, 40)}..."`)

    setTyping(true)
    await new Promise(r => setTimeout(r, 1200 + Math.random() * 800))
    addDebugEntry('INTENT_DETECTED: Qualification_Query')
    addDebugEntry('KB_LOOKUP: Searching knowledge base...')
    await new Promise(r => setTimeout(r, 400))

    const response = MOCK_RESPONSES[responseIdx % MOCK_RESPONSES.length]
    setResponseIdx(i => i + 1)
    setTyping(false)

    const aiMsg = { from: 'ai', text: response, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    setMessages(prev => [...prev, aiMsg])
    addDebugEntry('RESPONSE_GENERATED: 42ms')
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">

      {/* ── Top header ── */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-sm">smart_toy</span>
            </div>
            <span className="font-black text-slate-900 tracking-tight">Leadcense</span>
          </Link>
          <div className="hidden md:flex items-center gap-1 ml-4">
            {['Active Tests', 'Lead Flows', 'Analytics'].map((tab, i) => (
              <span key={tab} className={`px-3 py-1.5 text-sm font-medium rounded-lg cursor-pointer transition-colors ${
                i === 0 ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500 hover:bg-slate-100'
              }`}>
                {tab}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <button className="p-2 hover:bg-slate-50 rounded-full"><span className="material-symbols-outlined text-[20px]">tune</span></button>
          <button className="p-2 hover:bg-slate-50 rounded-full"><span className="material-symbols-outlined text-[20px]">help</span></button>
          <Link to="/signup" className="ml-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors">
            Create account
          </Link>
        </div>
      </header>

      {/* ── Left sidebar ── */}
      <aside className="hidden lg:flex flex-col w-64 fixed left-0 top-16 bottom-0 bg-slate-50 border-r border-slate-200 z-40">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">W</div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Workspace</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">AI Sandbox</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 py-2 overflow-y-auto">
          {[
            { icon: 'forum',        label: 'Active Tests',  active: true },
            { icon: 'account_tree', label: 'Lead Flows',    active: false },
            { icon: 'analytics',    label: 'Performance',   active: false },
            { icon: 'database',     label: 'Knowledge Base',active: false },
            { icon: 'settings',     label: 'Settings',      active: false },
          ].map(item => (
            <div key={item.label} className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all text-sm font-medium ${
              item.active
                ? 'text-indigo-600 bg-indigo-50 border-r-2 border-indigo-600'
                : 'text-slate-600 hover:bg-slate-100'
            }`}>
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              {item.label}
            </div>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={() => { setMessages([]); setResponseIdx(0); setDebugLog([]) }}
            className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            New Session
          </button>
          <p className="text-center text-[10px] text-slate-400 mt-2">v2.4 Engine Active</p>
        </div>
      </aside>

      {/* ── Main: WhatsApp UI ── */}
      <main className="flex-1 ml-0 lg:ml-64 mr-0 xl:mr-80 pt-16 flex flex-col overflow-hidden">
        <div className="flex-1 p-4 lg:p-6 overflow-hidden flex flex-col">
          <div className="flex-1 bg-white rounded-2xl shadow-lg border border-slate-200 flex overflow-hidden">

            {/* Chat list */}
            <div className="w-1/3 border-r border-slate-200 flex flex-col bg-white">
              <div className="h-14 bg-slate-50 flex items-center justify-between px-4">
                <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">AI</div>
                <div className="flex gap-3 text-slate-500">
                  <span className="material-symbols-outlined text-[20px] cursor-pointer">chat</span>
                  <span className="material-symbols-outlined text-[20px] cursor-pointer">more_vert</span>
                </div>
              </div>
              <div className="p-3">
                <div className="relative">
                  <input className="w-full bg-slate-100 rounded-xl py-2 pl-9 pr-3 text-sm outline-none" placeholder="Search or start new chat" />
                  <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-[18px]">search</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <div className="flex items-center gap-3 px-4 py-4 bg-slate-100 cursor-pointer border-b border-slate-100">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-sm">Y</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between">
                      <span className="text-sm font-bold text-slate-900">You</span>
                      <span className="text-[10px] text-slate-400">Now</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate italic">Testing playground…</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-4 hover:bg-slate-50 cursor-pointer border-b border-slate-50 opacity-60">
                  <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold text-sm">JM</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-slate-700">James Miller</span>
                      <span className="text-[10px] text-slate-400">Yesterday</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">I'll get back to you later.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat window */}
            <div className="flex-1 flex flex-col">
              <div className="h-14 bg-slate-50 flex items-center justify-between px-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">Y</div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Test Session</p>
                    <p className="text-[10px] text-indigo-600 font-semibold uppercase">Online</p>
                  </div>
                </div>
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3" style={{ background: '#efeae2' }}>
                {messages.length === 0 && (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <span className="material-symbols-outlined text-slate-400 text-[48px] block mb-3">forum</span>
                      <p className="text-sm text-slate-500 font-medium">Start a conversation</p>
                      <p className="text-xs text-slate-400 mt-1">Type a message to test your AI agent</p>
                    </div>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.from === 'ai' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-3 py-2 rounded-xl shadow-sm ${
                      msg.from === 'ai'
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : 'bg-white text-slate-800 rounded-tl-none border border-slate-200'
                    }`}>
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                      <p className={`text-[10px] mt-0.5 text-right ${msg.from === 'ai' ? 'text-indigo-200' : 'text-slate-400'}`}>{msg.time}</p>
                    </div>
                  </div>
                ))}
                {typing && (
                  <div className="flex justify-end">
                    <div className="bg-indigo-600 text-white px-4 py-3 rounded-xl rounded-tr-none shadow-sm">
                      <div className="flex gap-1 items-center">
                        {[0, 1, 2].map(i => (
                          <div key={i} className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="h-14 bg-slate-50 flex items-center gap-2 px-4 border-t border-slate-200">
                <span className="material-symbols-outlined text-slate-400 text-[20px] cursor-pointer">sentiment_satisfied</span>
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Type a message…"
                  className="flex-1 bg-white border border-slate-200 rounded-xl py-2 px-4 text-sm outline-none focus:ring-1 focus:ring-indigo-600"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || typing}
                  className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-[20px]">send</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Right: Agent Debugger ── */}
      <aside className="hidden xl:flex flex-col w-80 fixed right-0 top-16 bottom-0 bg-white border-l border-slate-200 z-40 font-mono text-xs">
        <div className="p-4 border-b border-slate-200">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Agent Debugging</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Real-time Logic Trace</p>
        </div>

        <div className="flex border-b border-slate-200">
          {['Logic Trace', 'Variables', 'API Logs'].map((tab, i) => (
            <div key={tab} className={`flex-1 py-3 text-center cursor-pointer text-[10px] font-bold transition-colors ${
              i === 0 ? 'text-indigo-600 border-b-2 border-indigo-600 bg-slate-50' : 'text-slate-400 hover:text-indigo-500'
            }`}>
              {tab}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {debugLog.length === 0 && (
            <div className="text-center py-8 text-slate-300">
              <span className="material-symbols-outlined text-[32px] block mb-2">terminal</span>
              <p>Send a message to see the logic trace</p>
            </div>
          )}
          {debugLog.map((entry, i) => (
            <div key={i} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <div className="flex items-center gap-2 text-green-600 mb-1">
                <span className="material-symbols-outlined text-[12px]">check_circle</span>
                <span className="font-bold text-[10px]">{entry.text.split(':')[0]}</span>
              </div>
              <p className="text-slate-500 leading-relaxed text-[11px]">{entry.text.split(':').slice(1).join(':').trim()}</p>
              <p className="text-slate-300 text-[9px] mt-1">{entry.time}</p>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-200">
          <button
            onClick={() => { setMessages([]); setResponseIdx(0); setDebugLog([]) }}
            className="w-full py-2 bg-slate-100 text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 text-xs font-bold"
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            Reset Logic Engine
          </button>
        </div>
      </aside>

    </div>
  )
}
