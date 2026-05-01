import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../hooks/useToast'
import { getDashboardMetrics, sendPlaygroundMessage } from '../services/api'
import { INDUSTRY_LABELS } from '../utils/constants'

function DonutChart({ segments, size = 100, sw = 18 }) {
  const r = (size - sw) / 2
  const circ = 2 * Math.PI * r
  let offset = 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      {segments.map((seg, i) => {
        const dash = (seg.percentage / 100) * circ
        const el = (
          <circle
            key={i}
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={sw}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-(offset / 100) * circ}
          />
        )
        offset += seg.percentage
        return el
      })}
    </svg>
  )
}

export default function Dashboard() {
  const { dbUser, idToken } = useAuth()
  const user = dbUser?.user
  const agent = dbUser?.agent_config
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  // Dashboard state
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Playground state — initialise from ?tab= query param
  const [activeTab, setActiveTab] = useState(
    searchParams.get('tab') === 'playground' ? 'playground' : 'overview'
  )
  const [messages, setMessages] = useState([])
  const [playgroundInput, setPlaygroundInput] = useState('')
  const [playgroundLoading, setPlaygroundLoading] = useState(false)
  const [conversationId, setConversationId] = useState(null)
  const bottomRef = useRef(null)

  // Fetch dashboard metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true)
        const data = await getDashboardMetrics(idToken)
        setDashboardData(data)
        setError(null)
      } catch (err) {
        console.error('Error fetching dashboard metrics:', err)
        setError(err.message)
        toast('Failed to load dashboard metrics', 'error')
      } finally {
        setLoading(false)
      }
    }

    if (idToken) {
      fetchMetrics()
    }
  }, [idToken, toast])

  // Auto-scroll to bottom of playground messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Send playground message
  const handlePlaygroundMessage = async () => {
    const text = playgroundInput.trim()
    if (!text) return

    try {
      setPlaygroundLoading(true)
      setPlaygroundInput('')

      // Add user message to display
      const userMsg = {
        from: 'user',
        text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages(prev => [...prev, userMsg])

      // Send to API
      const response = await sendPlaygroundMessage(idToken, {
        content: text,
        client_name: `Client`,
      })

      // Add AI response to display
      const aiMsg = {
        from: 'ai',
        text: response.reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages(prev => [...prev, aiMsg])
      setConversationId(response.conversation_id)
    } catch (err) {
      console.error('Error sending playground message:', err)
      toast('Failed to send message', 'error')
    } finally {
      setPlaygroundLoading(false)
    }
  }

  const handlePlaygroundKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handlePlaygroundMessage()
    }
  }

  const clearPlayground = () => {
    setMessages([])
    setConversationId(null)
    setPlaygroundInput('')
  }

  if (loading && !dashboardData) {
    return (
      <Layout>
        <main className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-background">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-indigo-100 mb-4">
              <span className="material-symbols-outlined text-indigo-600 animate-spin">hourglass_top</span>
            </div>
            <p className="text-slate-600 font-medium">Loading dashboard...</p>
          </div>
        </main>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <main className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-background">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-red-100 mb-4">
              <span className="material-symbols-outlined text-red-600">error</span>
            </div>
            <p className="text-slate-600 font-medium">{error}</p>
          </div>
        </main>
      </Layout>
    )
  }

  // Transform lead status distribution for donut chart
  const leadStatusSegments = (dashboardData?.lead_status_distribution || []).map((item, idx) => {
    const colors = ['#4f46e5', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']
    return {
      status: item.status,
      percentage: item.percentage,
      color: colors[idx % colors.length],
    }
  })

  // Format weekly message volume bar data
  const weeklyData = dashboardData?.weekly_message_volume || []

  return (
    <Layout>
      <main className="overflow-y-auto bg-background p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-64px)]">
        <div className="mx-auto max-w-7xl">

          {/* Tab selector */}
          <div className="mb-6 flex gap-2 border-b border-slate-200">
            {[
              { key: 'overview',    label: 'Overview' },
              { key: 'playground', label: 'Playground' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key)
                  setSearchParams(tab.key === 'playground' ? { tab: 'playground' } : {})
                }}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Page header */}
              <div className="mb-8">
                <h1 className="text-h1 font-h1 text-slate-900">
                  Welcome back, {user?.name?.split(' ')[0] ?? 'there'} 👋
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  {user?.email} · {INDUSTRY_LABELS[user?.industry] ?? user?.industry}
                </p>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-8">
                {[
                  {
                    label: 'Total Conversations',
                    current: dashboardData?.conversations?.total_current_month || 0,
                    previous: dashboardData?.conversations?.total_previous_month || 0,
                    change: dashboardData?.conversations?.percentage_change || 0,
                    icon: 'forum',
                  },
                  {
                    label: 'Message Volume',
                    current: dashboardData?.message_volume?.total_current_month || 0,
                    previous: dashboardData?.message_volume?.total_previous_month || 0,
                    change: dashboardData?.message_volume?.percentage_change || 0,
                    icon: 'message',
                  },
                  {
                    label: 'Leads Generated',
                    current: dashboardData?.leads?.total_current_month || 0,
                    previous: dashboardData?.leads?.total_previous_month || 0,
                    change: dashboardData?.leads?.percentage_change || 0,
                    icon: 'group',
                  },
                ].map(stat => {
                  const up = stat.change >= 0
                  return (
                    <div key={stat.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                        <div className="p-2 bg-indigo-50 rounded-lg">
                          <span className="material-symbols-outlined text-indigo-600 text-[20px]">{stat.icon}</span>
                        </div>
                      </div>
                      <p className="text-h2 font-h2 text-slate-900">{stat.current.toLocaleString()}</p>
                      <p className={`mt-2 text-sm font-semibold flex items-center gap-1 ${up ? 'text-green-600' : 'text-red-500'}`}>
                        <span className="material-symbols-outlined text-[16px]">{up ? 'arrow_upward' : 'arrow_downward'}</span>
                        {Math.abs(stat.change).toFixed(1)}% vs last month
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Charts row */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 mb-8">

                {/* Bar chart - Message Volume */}
                <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <div className="mb-6">
                    <h2 className="text-base font-semibold text-slate-900">Message Volume</h2>
                    <p className="text-sm text-slate-500">This week's activity</p>
                  </div>
                  <div className="flex items-end gap-3 h-36">
                    {weeklyData.map((bar, idx) => {
                      const maxVolume = Math.max(...weeklyData.map(d => d.volume), 1)
                      const pct = (bar.volume / maxVolume) * 100
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                          <div
                            className="w-full rounded-t-lg transition-all"
                            style={{
                              height: `${pct}%`,
                              background: pct === 100 ? '#4f46e5' : `rgba(79,70,229,${0.4 + pct / 200})`,
                            }}
                          />
                          <span className="text-xs text-slate-500">{bar.day.slice(0, 3)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Donut chart - Lead Status Distribution */}
                <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <h2 className="text-base font-semibold text-slate-900 mb-5">Lead Status Distribution</h2>
                  <div className="flex items-center gap-6">
                    <div className="shrink-0">
                      {leadStatusSegments.length > 0 ? (
                        <DonutChart segments={leadStatusSegments} size={104} sw={18} />
                      ) : (
                        <div className="w-[104px] h-[104px] bg-slate-100 rounded-lg flex items-center justify-center">
                          <span className="text-xs text-slate-400">No data</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2.5 min-w-0">
                      {leadStatusSegments.length > 0 ? (
                        leadStatusSegments.map(item => (
                          <div key={item.status} className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                            <span className="text-xs text-slate-600 flex-1 capitalize">{item.status}</span>
                            <span className="text-xs font-semibold text-slate-900">{item.percentage.toFixed(1)}%</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500">No leads yet</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Agent config */}
              {agent && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-base font-semibold text-slate-900">AI Agent Configuration</h2>
                    <span className="material-symbols-outlined text-slate-300">smart_toy</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[
                      { label: 'Temperature', value: agent.temperature ?? 'N/A' },
                      { label: 'Lead Qualification', value: agent.enable_lead_qualification ? 'Enabled' : 'Disabled' },
                      { label: 'Status', value: agent.is_active ? 'Active' : 'Inactive' },
                      { label: 'Mode', value: agent.strict_mode ? 'Strict' : 'Normal' },
                    ].map(item => (
                      <div key={item.label} className="bg-slate-50 rounded-xl p-4">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{item.label}</p>
                        <p className="text-sm font-semibold text-slate-900 capitalize">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Playground Tab */}
          {activeTab === 'playground' && (
            <div className="mb-8">
              <div className="mb-4">
                <h1 className="text-h1 font-h1 text-slate-900">Playground</h1>
                <p className="mt-1 text-sm text-slate-500">Test your AI agent by simulating client interactions</p>
              </div>

              {/* Playground Chat Interface */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">

                {/* Chat messages */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4" style={{ background: '#efeae2' }}>
                  {messages.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <span className="material-symbols-outlined text-slate-400 text-[48px] block mb-3">forum</span>
                        <p className="text-sm text-slate-500 font-medium">Start a conversation</p>
                        <p className="text-xs text-slate-400 mt-1">Type a message to test your AI agent</p>
                      </div>
                    </div>
                  ) : (
                    messages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.from === 'ai' ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] px-4 py-3 rounded-xl shadow-sm ${
                            msg.from === 'ai'
                              ? 'bg-indigo-600 text-white rounded-tr-none'
                              : 'bg-white text-slate-800 rounded-tl-none border border-slate-200'
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{msg.text}</p>
                          <p
                            className={`text-[11px] mt-1 text-right ${
                              msg.from === 'ai' ? 'text-indigo-200' : 'text-slate-400'
                            }`}
                          >
                            {msg.time}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  {playgroundLoading && (
                    <div className="flex justify-end">
                      <div className="bg-indigo-600 text-white px-4 py-3 rounded-xl rounded-tr-none shadow-sm">
                        <div className="flex gap-1 items-center">
                          {[0, 1, 2].map(i => (
                            <div
                              key={i}
                              className="w-2 h-2 bg-white/70 rounded-full animate-bounce"
                              style={{ animationDelay: `${i * 0.15}s` }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Input area */}
                <div className="border-t border-slate-200 bg-white p-4 flex gap-2">
                  <input
                    type="text"
                    value={playgroundInput}
                    onChange={e => setPlaygroundInput(e.target.value)}
                    onKeyDown={handlePlaygroundKeyDown}
                    placeholder="Type a message..."
                    disabled={playgroundLoading}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm outline-none focus:ring-1 focus:ring-indigo-600 disabled:opacity-50"
                  />
                  <button
                    onClick={handlePlaygroundMessage}
                    disabled={!playgroundInput.trim() || playgroundLoading}
                    className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[20px]">send</span>
                  </button>
                  <button
                    onClick={clearPlayground}
                    disabled={messages.length === 0 || playgroundLoading}
                    className="p-3 bg-slate-200 text-slate-600 rounded-xl hover:bg-slate-300 transition-colors disabled:opacity-40"
                    title="Clear conversation"
                  >
                    <span className="material-symbols-outlined text-[20px]">refresh</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </Layout>
  )
}
