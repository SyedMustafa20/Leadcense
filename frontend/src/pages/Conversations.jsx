import { useState } from 'react'
import Layout from '../components/Layout'

const CHATS = [
  { id: 1, name: 'James Wilson',  last: "I'd like to learn more about pricing.", time: '2m',      status: 'AI Agent',      statusColor: 'bg-indigo-100 text-indigo-700', active: true },
  { id: 2, name: 'Sarah Chen',    last: 'Can I speak to a human agent?',          time: '15m',     status: 'Awaiting Human', statusColor: 'bg-amber-100 text-amber-700',  active: false },
  { id: 3, name: 'Marcus Thorne', last: 'Thanks for the information!',             time: 'Yesterday', status: 'Resolved',    statusColor: 'bg-green-100 text-green-700',  active: false },
]

const MESSAGES = [
  { from: 'user', text: 'Hi! I saw your ad on LinkedIn about AI lead qualification. Can you tell me more?', time: '10:24' },
  { from: 'ai',   text: 'Hello James! I\'d be happy to help. Leadcense uses AI to qualify your WhatsApp leads 24/7. What\'s your main challenge with lead qualification today?', time: '10:24' },
  { from: 'user', text: 'We get around 200 leads per week but our team can only handle 40–50 properly.', time: '10:25' },
  { from: 'ai',   text: 'That\'s a common challenge. Our AI can pre-qualify all 200 leads and surface only the top 20–30% to your sales team. Would you like to see a demo?', time: '10:25' },
  { from: 'user', text: "I'd like to learn more about pricing.", time: '10:26' },
]

export default function Conversations() {
  const [activeChat, setActiveChat] = useState(1)
  const [input, setInput] = useState('')

  return (
    <Layout>
      <div className="flex h-[calc(100vh-64px)] bg-background">

        {/* ── Chat list ── */}
        <div className="w-80 shrink-0 flex flex-col border-r border-slate-200 bg-white">
          <div className="p-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900 mb-3">Active Chats</h2>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none">search</span>
              <input
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                placeholder="Search conversations…"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {CHATS.map(chat => (
              <button
                key={chat.id}
                onClick={() => setActiveChat(chat.id)}
                className={`w-full text-left px-4 py-4 border-b border-slate-50 flex items-start gap-3 transition-colors ${
                  activeChat === chat.id ? 'bg-indigo-50' : 'hover:bg-slate-50'
                }`}
              >
                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">
                  {chat.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-slate-900 truncate">{chat.name}</span>
                    <span className="text-[10px] text-slate-400 ml-2 shrink-0">{chat.time}</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mb-2">{chat.last}</p>
                  <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${chat.statusColor}`}>
                    {chat.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Chat window ── */}
        <div className="flex-1 flex flex-col">
          {/* Chat header */}
          <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                JW
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">James Wilson</p>
                <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">Online</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <button className="p-2 hover:bg-slate-50 rounded-lg transition-colors">
                <span className="material-symbols-outlined text-[20px]">call</span>
              </button>
              <button className="p-2 hover:bg-slate-50 rounded-lg transition-colors">
                <span className="material-symbols-outlined text-[20px]">more_vert</span>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-slate-50/50">
            {MESSAGES.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === 'ai' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[70%] px-4 py-3 rounded-2xl shadow-sm ${
                    msg.from === 'ai'
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-white text-slate-800 rounded-tl-none border border-slate-200'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                  <p className={`text-[10px] mt-1 ${msg.from === 'ai' ? 'text-indigo-200 text-right' : 'text-slate-400 text-right'}`}>
                    {msg.time}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="h-16 bg-white border-t border-slate-200 flex items-center gap-3 px-4">
            <button className="p-2 text-slate-400 hover:text-slate-600">
              <span className="material-symbols-outlined text-[20px]">sentiment_satisfied</span>
            </button>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 py-2 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
            />
            <button className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors">
              <span className="material-symbols-outlined text-[20px]">send</span>
            </button>
          </div>
        </div>

        {/* ── Manager Override ── */}
        <div className="hidden xl:flex xl:w-80 xl:flex-col bg-white border-l border-slate-200 overflow-y-auto">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Manager Override</h3>
          </div>

          <div className="p-5 flex flex-col gap-6">
            {/* Pause AI */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">Pause AI Agent</p>
                <p className="text-xs text-slate-400 mt-0.5">Take over conversation manually</p>
              </div>
              <button className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-slate-200 transition-colors duration-200 focus:outline-none">
                <span className="translate-x-0 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200" />
              </button>
            </div>

            {/* Response creativity */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-700">Response Creativity</p>
                <span className="text-xs text-slate-400">65%</span>
              </div>
              <input type="range" min="0" max="100" defaultValue="65" className="w-full accent-indigo-600" />
            </div>

            {/* Lead score */}
            <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-indigo-900">Lead Score</span>
                <span className="text-xl font-bold text-indigo-600">72%</span>
              </div>
              <div className="w-full h-2 bg-white rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 w-[72%]" />
              </div>
              <p className="mt-2 text-xs text-indigo-700">Warm lead — AI recommends follow-up within 24h.</p>
            </div>

            {/* Session context */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Session Context</p>
              <div className="space-y-2">
                {[
                  { label: 'Intent', value: 'Pricing inquiry' },
                  { label: 'Stage', value: 'Consideration' },
                  { label: 'Messages', value: '5 exchanged' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between py-1">
                    <span className="text-xs text-slate-500">{item.label}</span>
                    <span className="text-xs font-medium text-slate-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  )
}
