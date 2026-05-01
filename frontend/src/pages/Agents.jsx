import Layout from '../components/Layout'

const INTEGRATIONS = [
  { name: 'Slack',       icon: 'chat_bubble',     connected: true,  color: 'text-green-600' },
  { name: 'Salesforce',  icon: 'cloud',            connected: false, color: 'text-slate-400' },
  { name: 'Discord',     icon: 'videogame_asset',  connected: false, color: 'text-slate-400' },
]

export default function Agents() {
  return (
    <Layout>
      <main className="overflow-y-auto bg-background p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-64px)]">
        <div className="mx-auto max-w-7xl">

          {/* Page header */}
          <div className="mb-8">
            <h1 className="text-h1 font-h1 text-slate-900">Agent Manager</h1>
            <p className="mt-2 text-sm text-slate-500">Configure your AI agent's personality, knowledge base, and handoff rules.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

            {/* ── Left column ── */}
            <div className="lg:col-span-7 flex flex-col gap-6">

              {/* Agent Personality */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-900">Agent Personality</h2>
                  <span className="material-symbols-outlined text-slate-300">smart_toy</span>
                </div>
                <div className="p-6 flex flex-col gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Display Name</label>
                    <input
                      defaultValue="Nexus"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Language</label>
                    <select className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 bg-white cursor-pointer">
                      <option>English</option>
                      <option>Spanish</option>
                      <option>French</option>
                      <option>Arabic</option>
                    </select>
                  </div>

                  {/* Tone sliders */}
                  {[
                    { left: 'Casual', right: 'Formal', defaultVal: 40 },
                    { left: 'Reserved', right: 'Enthusiastic', defaultVal: 65 },
                    { left: 'Concise', right: 'Explanatory', defaultVal: 55 },
                  ].map(slider => (
                    <div key={slider.left}>
                      <div className="flex justify-between mb-2">
                        <span className="text-xs font-medium text-slate-500">{slider.left}</span>
                        <span className="text-xs font-medium text-slate-500">{slider.right}</span>
                      </div>
                      <input type="range" min="0" max="100" defaultValue={slider.defaultVal} className="w-full accent-indigo-600" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Knowledge Base */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-900">Knowledge Base</h2>
                  <span className="material-symbols-outlined text-slate-300">database</span>
                </div>
                <div className="p-6">
                  {/* Upload zone */}
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer mb-5">
                    <span className="material-symbols-outlined text-slate-300 text-[40px] mb-3 block">cloud_upload</span>
                    <p className="text-sm font-medium text-slate-700">Drop files here or <span className="text-indigo-600">browse</span></p>
                    <p className="text-xs text-slate-400 mt-1">PDF, DOCX, TXT — max 10 MB</p>
                  </div>

                  {/* File list */}
                  <div className="flex flex-col gap-2">
                    {[
                      { name: 'pricing-sheet-2024.pdf', size: '2.4 MB', icon: 'picture_as_pdf' },
                      { name: 'product-faq.docx',       size: '840 KB', icon: 'description' },
                    ].map(file => (
                      <div key={file.name} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="material-symbols-outlined text-indigo-600 text-[20px]">{file.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                          <p className="text-xs text-slate-400">{file.size}</p>
                        </div>
                        <button className="text-slate-400 hover:text-red-500 transition-colors">
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right column ── */}
            <div className="lg:col-span-5 flex flex-col gap-6">

              {/* Human Handoff */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-900">Human Handoff</h2>
                  <span className="material-symbols-outlined text-slate-300">support_agent</span>
                </div>
                <div className="p-6 flex flex-col gap-5">
                  {[
                    { label: 'Sentiment Threshold', desc: 'Hand off when frustration detected', on: true },
                    { label: 'Keyword Triggers', desc: 'Words like "lawsuit", "cancel", "refund"', on: false },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-700">{item.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                      </div>
                      <button className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${item.on ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${item.on ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  ))}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Handoff Department</label>
                    <select className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-indigo-600 bg-white cursor-pointer">
                      <option>Sales Team</option>
                      <option>Support Team</option>
                      <option>Management</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Integrations */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-900">Integrations</h2>
                  <span className="material-symbols-outlined text-slate-300">extension</span>
                </div>
                <div className="p-6 flex flex-col gap-3">
                  {INTEGRATIONS.map(item => (
                    <div key={item.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-3">
                        <span className={`material-symbols-outlined text-[20px] ${item.color}`}>{item.icon}</span>
                        <span className="text-sm font-medium text-slate-700">{item.name}</span>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${item.connected ? 'bg-green-50 text-green-700 ring-1 ring-green-200' : 'bg-slate-100 text-slate-500'}`}>
                        {item.connected ? 'Connected' : 'Connect'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Agent Health */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-900">Agent Health</h2>
                  <span className="material-symbols-outlined text-green-500">check_circle</span>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-700">Uptime Score</span>
                    <span className="text-2xl font-bold text-green-600">98%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 w-[98%] rounded-full" />
                  </div>
                  <p className="text-xs text-slate-400 mt-2">All systems operational. Last check: 2 min ago.</p>
                </div>
              </div>

            </div>
          </div>

          {/* Save button */}
          <div className="mt-8 flex justify-end gap-3">
            <button className="px-6 py-3 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
              Discard Changes
            </button>
            <button className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
              Save Configuration
            </button>
          </div>

        </div>
      </main>
    </Layout>
  )
}
