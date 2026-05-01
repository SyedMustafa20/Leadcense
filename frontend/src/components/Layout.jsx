import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { logOut } from '../services/firebase'

const NAV_ITEMS = [
  { label: 'Dashboard',     path: '/dashboard',     icon: 'dashboard' },
  { label: 'Playground',    path: '/playground',    icon: 'play_circle' },
  { label: 'Leads',         path: '/leads',         icon: 'group' },
  { label: 'Conversations', path: '/conversations', icon: 'forum' },
  { label: 'Agents',        path: '/agents',        icon: 'smart_toy' },
]

const BOTTOM_NAV = [
  { label: 'Settings', path: '/settings', icon: 'settings' },
]

export default function Layout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { dbUser } = useAuth()
  const user = dbUser?.user

  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleSignOut() {
    setShowMenu(false)
    await logOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Sidebar ── */}
      <aside className="hidden lg:flex lg:w-72 lg:flex-col fixed inset-y-0 bg-white border-r border-slate-200 z-40">
        <div className="flex flex-col flex-1 overflow-y-auto px-6 pt-6 pb-4">

          {/* Brand */}
          <div className="flex h-12 shrink-0 items-center gap-3 mb-6">
            <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-lg">smart_toy</span>
            </div>
            <div>
              <div className="text-base font-black text-slate-900">Leadcense</div>
              <div className="text-[10px] font-semibold text-indigo-600 uppercase tracking-widest">Enterprise AI</div>
            </div>
          </div>

          {/* Main nav */}
          <nav className="flex flex-1 flex-col">
            <ul className="flex flex-1 flex-col gap-y-1" role="list">
              {NAV_ITEMS.map(item => {
                const active = location.pathname === item.path
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`group flex gap-x-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                        active
                          ? 'bg-indigo-50 text-indigo-600'
                          : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-[20px] ${active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-600'}`}>
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* ── Profile card in nav area ── */}
          <div className="mt-auto pt-4 border-t border-slate-200 px-4 py-3" ref={menuRef}>
            <button
              onClick={() => setShowMenu(s => !s)}
              className="w-full flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-slate-100 transition-colors text-left"
            >
              <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email || ''}</p>
              </div>
              <span className="material-symbols-outlined text-slate-400 text-[18px]">unfold_more</span>
            </button>

            {/* Dropdown — opens upward */}
            {showMenu && (
              <div className="absolute bottom-20 left-4 right-4 z-50 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                <Link
                  to="/settings"
                  onClick={() => setShowMenu(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-slate-400 text-[18px]">manage_accounts</span>
                  Account settings
                </Link>
                <div className="border-t border-slate-100">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <span className="material-symbols-outlined text-red-500 text-[18px]">logout</span>
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="lg:pl-72">
        {children}
      </div>
    </div>
  )
}
