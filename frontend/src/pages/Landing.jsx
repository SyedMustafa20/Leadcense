import { Link } from 'react-router-dom'

const FEATURES = [
  '24/7 automated lead qualification',
  'Industry-tailored AI conversations',
  'CRM-ready lead data extraction',
]

export default function Landing() {
  return (
    // flex: 1 fills the column #root; flex (row) splits into two panels
    <main style={{ flex: 1, display: 'flex', minHeight: 0 }}>

      {/* ── Left panel — brand + description + playground ── */}
      {/* hidden on mobile, shown as flex column on lg+ */}
      <div
        className="hidden lg:flex"
        style={{
          flex: '0 0 46%',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '48px 52px',
          background: 'var(--accent)',
          position: 'relative',
          overflow: 'hidden',
          textAlign: 'left',
        }}
      >
        {/* Decorative background circles */}
        <div style={{
          position: 'absolute', top: -100, right: -100,
          width: 360, height: 360, borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -80, left: -80,
          width: 280, height: 280, borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 44, position: 'relative' }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'rgba(255,255,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 1.5l2 5H17l-4.3 3.1 1.6 5-4.3-2.8-4.3 2.8 1.6-5L3 6.5h6z" fill="white"/>
            </svg>
          </div>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 20, letterSpacing: '-0.4px' }}>
            Leadcense
          </span>
        </div>

        {/* Headline */}
        <p style={{
          color: 'white', fontSize: 28, fontWeight: 700,
          lineHeight: 1.25, letterSpacing: '-0.5px', marginBottom: 18,
          position: 'relative',
        }}>
          AI-powered WhatsApp<br />lead qualification
        </p>

        {/* 2-3 liner description */}
        <p style={{
          color: 'rgba(255,255,255,0.82)',
          fontSize: 15, lineHeight: 1.65,
          marginBottom: 40, maxWidth: 340,
          position: 'relative',
        }}>
          Your AI agent qualifies leads 24/7 on WhatsApp — capturing intent,
          collecting key data, and handing off only sales-ready prospects to
          your team. No code required.
        </p>
      </div>

      {/* ── Right panel — CTAs ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 32px',
        textAlign: 'left',
      }}>

        {/* Mobile logo (only visible on small screens) */}
        <div
          className="flex lg:hidden"
          style={{ alignItems: 'center', gap: 8, marginBottom: 32, alignSelf: 'flex-start' }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1l1.7 4H14l-3.5 2.5 1.3 4L7 9.3l-4.8 2.2 1.3-4L0 5h5.3z" fill="white"/>
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-h)', letterSpacing: '-0.3px' }}>
            Leadcense
          </span>
        </div>

        <div style={{ width: '100%', maxWidth: 360 }}>
          <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-h)', marginBottom: 6, letterSpacing: '-0.4px' }}>
            Get started today
          </p>
          <p style={{ fontSize: 14, color: 'var(--text)', marginBottom: 28, lineHeight: 1.55 }}>
            Set up your AI lead qualifier in minutes.
          </p>

          {/* Primary CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
            <Link
              to="/signup"
              style={{
                display: 'block', textAlign: 'center',
                padding: '13px 0',
                background: 'var(--accent)', color: 'white',
                borderRadius: 12, fontWeight: 600, fontSize: 15,
                textDecoration: 'none',
              }}
            >
              Create account
            </Link>
            <Link
              to="/signin"
              style={{
                display: 'block', textAlign: 'center',
                padding: '12px 0',
                border: '1px solid var(--border)',
                borderRadius: 12, fontWeight: 500, fontSize: 15,
                color: 'var(--text-h)', textDecoration: 'none',
              }}
            >
              Sign in
            </Link>
          </div>

          {/* Feature checklist */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {FEATURES.map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                    <path d="M1.5 4.5l2 2 4-4" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span style={{ fontSize: 13, color: 'var(--text)' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
