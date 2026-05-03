import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import Toast from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../hooks/useToast'
import { getAgentConfig, updateAgentConfig } from '../services/api'

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseQuestions(raw) {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function serializeQuestions(questions) {
  if (!questions.length) return null
  return JSON.stringify(
    questions.map((q, i) => ({
      order:    i + 1,
      question: q.question,
      field:    q.field,
      required: q.required,
    }))
  )
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 40)
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Section({ title, icon, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <span className="material-symbols-outlined text-slate-300">{icon}</span>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function Toggle({ checked, onChange, label, desc }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {desc && <p className="text-xs text-slate-400 mt-0.5">{desc}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
          checked ? 'bg-indigo-600' : 'bg-slate-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

function QuestionItem({ q, index, total, onChange, onDelete, onMove }) {
  return (
    <div className="flex gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 group">
      {/* Order + move controls */}
      <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
        <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold flex items-center justify-center">
          {index + 1}
        </span>
        <button
          type="button"
          onClick={() => onMove(index, index - 1)}
          disabled={index === 0}
          className="text-slate-300 hover:text-slate-500 disabled:opacity-20 transition-colors"
          title="Move up"
        >
          <span className="material-symbols-outlined text-[16px]">expand_less</span>
        </button>
        <button
          type="button"
          onClick={() => onMove(index, index + 1)}
          disabled={index === total - 1}
          className="text-slate-300 hover:text-slate-500 disabled:opacity-20 transition-colors"
          title="Move down"
        >
          <span className="material-symbols-outlined text-[16px]">expand_more</span>
        </button>
      </div>

      {/* Question text + metadata */}
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        <textarea
          rows={2}
          value={q.question}
          onChange={e => onChange(index, 'question', e.target.value)}
          placeholder="Enter qualification question…"
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none resize-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
        />
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[120px]">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300 text-[13px] font-mono">#</span>
            <input
              value={q.field}
              onChange={e => onChange(index, 'field', e.target.value)}
              placeholder="field_key"
              className="w-full pl-6 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono bg-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-500"
            />
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0">
            <div
              className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                q.required ? 'bg-indigo-600' : 'bg-slate-200'
              }`}
              onClick={() => onChange(index, 'required', !q.required)}
            >
              <span
                className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow transition duration-200 ${
                  q.required ? 'translate-x-3' : 'translate-x-0'
                }`}
              />
            </div>
            <span className="text-xs text-slate-500">Required</span>
          </label>
        </div>
      </div>

      {/* Delete */}
      <button
        type="button"
        onClick={() => onDelete(index)}
        className="shrink-0 text-slate-300 hover:text-red-500 transition-colors self-start mt-0.5"
        title="Remove question"
      >
        <span className="material-symbols-outlined text-[18px]">delete</span>
      </button>
    </div>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const textareaCls = 'w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm outline-none transition-all bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 resize-none'

// ── Page ───────────────────────────────────────────────────────────────────────

export default function Agents() {
  const { firebaseUser } = useAuth()
  const { toast, showToast, hideToast } = useToast()

  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [notFound, setNotFound] = useState(false)

  const [systemPrompt,              setSystemPrompt]              = useState('')
  const [temperature,               setTemperature]               = useState(0.7)
  const [greetingMessage,           setGreetingMessage]           = useState('')
  const [fallbackMessage,           setFallbackMessage]           = useState('')
  const [outOfScopeMessage,         setOutOfScopeMessage]         = useState('')
  const [enableLeadQualification,   setEnableLeadQualification]   = useState(true)
  const [strictMode,                setStrictMode]                = useState(false)
  const [questions,                 setQuestions]                 = useState([])

  const [original, setOriginal] = useState(null)

  useEffect(() => {
    if (!firebaseUser) return
    ;(async () => {
      try {
        const token  = await firebaseUser.getIdToken()
        const config = await getAgentConfig(token)
        applyConfig(config)
        setOriginal(config)
      } catch (err) {
        if (err.message.includes('404')) setNotFound(true)
        else showToast(err.message || 'Failed to load agent config.')
      } finally {
        setLoading(false)
      }
    })()
  }, [firebaseUser]) // eslint-disable-line

  function applyConfig(c) {
    setSystemPrompt(c.system_prompt ?? '')
    setTemperature(c.temperature ?? 0.7)
    setGreetingMessage(c.greeting_message ?? '')
    setFallbackMessage(c.fallback_message ?? '')
    setOutOfScopeMessage(c.out_of_scope_message ?? '')
    setEnableLeadQualification(c.enable_lead_qualification ?? true)
    setStrictMode(c.strict_mode ?? false)
    setQuestions(parseQuestions(c.qualification_questions))
  }

  function handleReset() {
    if (original) applyConfig(original)
  }

  // ── Question list mutations ────────────────────────────────────────────────

  function handleQuestionChange(index, key, value) {
    setQuestions(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [key]: value }
      // Auto-generate field slug when editing question text for the first time
      if (key === 'question' && !prev[index].field) {
        next[index].field = slugify(value)
      }
      return next
    })
  }

  function handleQuestionDelete(index) {
    setQuestions(prev => prev.filter((_, i) => i !== index))
  }

  function handleQuestionMove(from, to) {
    if (to < 0 || to >= questions.length) return
    setQuestions(prev => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  function handleAddQuestion() {
    setQuestions(prev => [...prev, { question: '', field: '', required: true }])
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const token   = await firebaseUser.getIdToken()
      const updated = await updateAgentConfig(token, {
        system_prompt:             systemPrompt.trim() || null,
        temperature,
        greeting_message:          greetingMessage.trim() || null,
        fallback_message:          fallbackMessage.trim() || null,
        out_of_scope_message:      outOfScopeMessage.trim() || null,
        enable_lead_qualification: enableLeadQualification,
        strict_mode:               strictMode,
        qualification_questions:   serializeQuestions(questions),
      })
      applyConfig(updated)
      setOriginal(updated)
      showToast('Agent configuration saved.')
    } catch (err) {
      showToast(err.message || 'Failed to save configuration.')
    } finally {
      setSaving(false)
    }
  }

  // ── Render guards ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Layout>
        <main className="bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8 flex items-center justify-center">
          <span className="material-symbols-outlined text-slate-300 text-[48px] animate-spin">hourglass_top</span>
        </main>
      </Layout>
    )
  }

  if (notFound) {
    return (
      <Layout>
        <main className="bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8 flex items-center justify-center">
          <div className="text-center">
            <span className="material-symbols-outlined text-slate-300 text-[48px] block mb-4">smart_toy</span>
            <p className="text-base font-semibold text-slate-700">No agent config found</p>
            <p className="text-sm text-slate-400 mt-1">Contact support to provision an agent for your account.</p>
          </div>
        </main>
      </Layout>
    )
  }

  const tempPct = Math.round(temperature * 100)

  return (
    <Layout>
      <Toast toast={toast} onClose={hideToast} />
      <main className="bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-3xl">

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Agent Manager</h1>
            <p className="mt-1 text-sm text-slate-500">Configure your AI agent's personality, messages, and qualification rules.</p>
          </div>

          <form onSubmit={handleSave}>
            <div className="flex flex-col gap-6">

              {/* ── AI Settings ── */}
              <Section title="AI Settings" icon="psychology">
                <div className="flex flex-col gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">System Prompt</label>
                    <p className="text-xs text-slate-400 mb-2">Core instructions that define your agent's persona and task scope.</p>
                    <textarea
                      rows={7}
                      value={systemPrompt}
                      onChange={e => setSystemPrompt(e.target.value)}
                      placeholder="You are a helpful sales assistant for…"
                      className={textareaCls}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                      Temperature
                      <span className="ml-2 text-xs font-normal text-slate-400">controls response creativity</span>
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 flex flex-col gap-1">
                        <input
                          type="range" min="0" max="1" step="0.01"
                          value={temperature}
                          onChange={e => setTemperature(parseFloat(e.target.value))}
                          className="w-full accent-indigo-600"
                        />
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>Focused (0.0)</span>
                          <span>Creative (1.0)</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-2xl font-bold text-indigo-600 tabular-nums w-14 text-right">{temperature.toFixed(2)}</span>
                        <div className="w-12 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-indigo-500" style={{ width: `${tempPct}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Section>

              {/* ── Messages ── */}
              <Section title="Agent Messages" icon="chat">
                <div className="flex flex-col gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Greeting Message</label>
                    <p className="text-xs text-slate-400 mb-2">Sent to new contacts when they first message your WhatsApp number.</p>
                    <textarea rows={3} value={greetingMessage} onChange={e => setGreetingMessage(e.target.value)} placeholder="Hi! Welcome to…" className={textareaCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Fallback Message</label>
                    <p className="text-xs text-slate-400 mb-2">Used when the agent can't understand or process a request.</p>
                    <textarea rows={3} value={fallbackMessage} onChange={e => setFallbackMessage(e.target.value)} placeholder="Sorry, I didn't quite get that…" className={textareaCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Out-of-Scope Message</label>
                    <p className="text-xs text-slate-400 mb-2">Sent when the user asks about something outside your business scope.</p>
                    <textarea rows={3} value={outOfScopeMessage} onChange={e => setOutOfScopeMessage(e.target.value)} placeholder="That's outside what I can help with…" className={textareaCls} />
                  </div>
                </div>
              </Section>

              {/* ── Lead Qualification ── */}
              <Section title="Lead Qualification" icon="fact_check">
                <div className="flex flex-col gap-6">

                  <div className="flex flex-col gap-4">
                    <Toggle
                      checked={!!enableLeadQualification}
                      onChange={setEnableLeadQualification}
                      label="Enable Lead Qualification"
                      desc="Agent actively qualifies leads by asking structured questions."
                    />
                    <div className="border-t border-slate-100" />
                    <Toggle
                      checked={!!strictMode}
                      onChange={setStrictMode}
                      label="Strict Mode"
                      desc="Agent stays strictly on topic and rejects unrelated questions."
                    />
                  </div>

                  {/* Question list */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-medium text-slate-700">Qualification Questions</p>
                        <p className="text-xs text-slate-400 mt-0.5">Questions the agent asks to qualify leads. Drag to reorder.</p>
                      </div>
                      <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        {questions.length} {questions.length === 1 ? 'question' : 'questions'}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2">
                      {questions.length === 0 ? (
                        <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
                          <span className="material-symbols-outlined text-slate-300 text-[32px] block mb-2">help_outline</span>
                          <p className="text-sm text-slate-400">No questions yet</p>
                          <p className="text-xs text-slate-300 mt-0.5">Add your first qualification question below.</p>
                        </div>
                      ) : (
                        questions.map((q, i) => (
                          <QuestionItem
                            key={i}
                            q={q}
                            index={i}
                            total={questions.length}
                            onChange={handleQuestionChange}
                            onDelete={handleQuestionDelete}
                            onMove={handleQuestionMove}
                          />
                        ))
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-slate-300 rounded-xl text-sm font-medium text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/40 transition-all"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      Add Question
                    </button>
                  </div>

                </div>
              </Section>

              {/* ── Save ── */}
              <div className="pt-2 pb-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save Configuration'}
                </button>
              </div>

            </div>
          </form>

        </div>
      </main>
    </Layout>
  )
}
