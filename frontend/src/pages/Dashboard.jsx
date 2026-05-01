import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import Toast from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../hooks/useToast'
import { getDashboardMetrics } from '../services/api'
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
  const { dbUser, firebaseUser } = useAuth()
  const user  = dbUser?.user
  const agent = dbUser?.agent_config
  const { toast, showToast, hideToast } = useToast()

  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)

  useEffect(() => {
    if (!firebaseUser) return

    let cancelled = false

    async function fetchMetrics() {
      try {
        setLoading(true)
        setError(null)
        const token = await firebaseUser.getIdToken()
        const data  = await getDashboardMetrics(token)
        if (!cancelled) setDashboardData(data)
      } catch (err) {
        console.error('[Dashboard] fetch error:', err)
        if (!cancelled) {
          setError(err.message)
          showToast('Failed to load dashboard metrics')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchMetrics()
    return () => { cancelled = true }
  }, [firebaseUser]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && !dashboardData) {
    return (
      <Layout>
        <Toast toast={toast} onClose={hideToast} />
        <main className="flex items-center justify-center min-h-screen bg-slate-50">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-100 mb-4">
              <span className="material-symbols-outlined text-indigo-600 animate-spin">hourglass_top</span>
            </div>
            <p className="text-slate-600 font-medium">Loading dashboard…</p>
          </div>
        </main>
      </Layout>
    )
  }

  if (error && !dashboardData) {
    return (
      <Layout>
        <Toast toast={toast} onClose={hideToast} />
        <main className="flex items-center justify-center min-h-screen bg-slate-50">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-red-100 mb-4">
              <span className="material-symbols-outlined text-red-500">error</span>
            </div>
            <p className="text-slate-700 font-medium mb-1">Could not load dashboard</p>
            <p className="text-slate-400 text-sm">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </main>
      </Layout>
    )
  }

  const SEGMENT_COLORS = ['#4f46e5', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']
  const leadStatusSegments = (dashboardData?.lead_status_distribution || []).map((item, idx) => ({
    status:     item.status,
    percentage: item.percentage,
    color:      SEGMENT_COLORS[idx % SEGMENT_COLORS.length],
  }))
  const weeklyData = dashboardData?.weekly_message_volume || []

  return (
    <Layout>
      <Toast toast={toast} onClose={hideToast} />
      <main className="bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">
              Welcome back, {user?.name?.split(' ')[0] ?? 'there'} 👋
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {user?.email} · {INDUSTRY_LABELS[user?.industry] ?? user?.industry}
            </p>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            {[
              {
                label:   'Total Conversations',
                current: dashboardData?.conversations?.total_current_month  ?? 0,
                change:  dashboardData?.conversations?.percentage_change     ?? 0,
                icon:    'forum',
              },
              {
                label:   'Message Volume',
                current: dashboardData?.message_volume?.total_current_month ?? 0,
                change:  dashboardData?.message_volume?.percentage_change    ?? 0,
                icon:    'message',
              },
              {
                label:   'Leads Generated',
                current: dashboardData?.leads?.total_current_month          ?? 0,
                change:  dashboardData?.leads?.percentage_change            ?? 0,
                icon:    'group',
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
                  <p className="text-3xl font-bold text-slate-900">{stat.current.toLocaleString()}</p>
                  <p className={`mt-2 text-sm font-semibold flex items-center gap-1 ${up ? 'text-green-600' : 'text-red-500'}`}>
                    <span className="material-symbols-outlined text-[16px]">{up ? 'arrow_upward' : 'arrow_downward'}</span>
                    {Math.abs(stat.change).toFixed(1)}% vs last month
                  </p>
                </div>
              )
            })}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">

            {/* Weekly bar chart */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-base font-semibold text-slate-900 mb-1">Message Volume</h2>
              <p className="text-sm text-slate-500 mb-6">Last 7 days</p>
              <div className="flex items-end gap-2 h-36">
                {weeklyData.length > 0 ? weeklyData.map((bar, idx) => {
                  const maxVol = Math.max(...weeklyData.map(d => d.volume), 1)
                  const pct   = (bar.volume / maxVol) * 100
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-medium">{bar.volume || ''}</span>
                      <div
                        className="w-full rounded-t-md transition-all"
                        style={{
                          height:     `${Math.max(pct, 4)}%`,
                          background: pct >= 100 ? '#4f46e5' : `rgba(79,70,229,${0.3 + pct / 150})`,
                          minHeight:  '4px',
                        }}
                      />
                      <span className="text-[11px] text-slate-500">{bar.day.slice(0, 3)}</span>
                    </div>
                  )
                }) : (
                  <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">No data yet</div>
                )}
              </div>
            </div>

            {/* Donut chart */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-base font-semibold text-slate-900 mb-5">Lead Status Distribution</h2>
              <div className="flex items-center gap-6">
                <div className="shrink-0">
                  {leadStatusSegments.length > 0 ? (
                    <DonutChart segments={leadStatusSegments} size={104} sw={20} />
                  ) : (
                    <div className="w-[104px] h-[104px] bg-slate-100 rounded-full flex items-center justify-center">
                      <span className="text-xs text-slate-400 text-center leading-tight">No<br/>leads</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2.5 min-w-0 flex-1">
                  {leadStatusSegments.length > 0 ? leadStatusSegments.map(item => (
                    <div key={item.status} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                      <span className="text-xs text-slate-600 flex-1 capitalize">{item.status}</span>
                      <span className="text-xs font-semibold text-slate-900">{item.percentage.toFixed(1)}%</span>
                    </div>
                  )) : (
                    <p className="text-xs text-slate-400">No leads yet. Start using the playground to generate leads.</p>
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
                <span className="material-symbols-outlined text-slate-300 text-[20px]">smart_toy</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Temperature',       value: agent.temperature ?? 'N/A' },
                  { label: 'Lead Qualification', value: agent.enable_lead_qualification ? 'Enabled' : 'Disabled' },
                  { label: 'Status',             value: agent.is_active ? 'Active' : 'Inactive' },
                  { label: 'Mode',               value: agent.strict_mode ? 'Strict' : 'Normal' },
                ].map(item => (
                  <div key={item.label} className="bg-slate-50 rounded-xl p-4">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{item.label}</p>
                    <p className="text-sm font-semibold text-slate-900 capitalize">{String(item.value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>
    </Layout>
  )
}
