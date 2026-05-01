import { createPortal } from 'react-dom'

const VARIANT = {
  error:   { bg: '#fef2f2', border: '#fecaca',              text: '#dc2626' },
  success: { bg: '#f0fdf4', border: '#bbf7d0',              text: '#16a34a' },
  info:    { bg: 'var(--accent-bg)', border: 'var(--accent-border)', text: 'var(--accent)' },
}

// Injects the keyframe once into <head> — harmless on re-renders because the
// browser deduplicates identical @keyframes declarations.
const ANIM_STYLE = `@keyframes _toast-in {
  from { opacity: 0; transform: translateY(-10px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0)     scale(1);    }
}`

export default function Toast({ toast, onClose }) {
  if (!toast) return null

  const v = VARIANT[toast.type] ?? VARIANT.error

  return createPortal(
    <>
      <style>{ANIM_STYLE}</style>
      <div
        role="alert"
        aria-live="assertive"
        style={{
          position:   'fixed',
          top:        24,
          right:      24,
          zIndex:     9999,
          maxWidth:   380,
          minWidth:   260,
          padding:    '13px 16px',
          borderRadius: 14,
          border:     `1px solid ${v.border}`,
          background: v.bg,
          color:      v.text,
          fontSize:   13,
          fontWeight: 500,
          display:    'flex',
          alignItems: 'flex-start',
          gap:        10,
          boxShadow:  '0 8px 30px rgba(0,0,0,0.12)',
          fontFamily: 'var(--sans)',
          animation:  '_toast-in 0.2s ease',
          lineHeight: 1.5,
        }}
      >
        {/* Icon */}
        <ToastIcon type={toast.type} color={v.text} />

        <span style={{ flex: 1 }}>{toast.message}</span>

        <button
          onClick={onClose}
          aria-label="Dismiss notification"
          style={{
            background: 'none',
            border:     'none',
            cursor:     'pointer',
            color:      v.text,
            opacity:    0.6,
            padding:    0,
            fontSize:   18,
            lineHeight: 1,
            flexShrink: 0,
            marginTop:  1,
          }}
        >
          ×
        </button>
      </div>
    </>,
    document.body
  )
}

function ToastIcon({ type, color }) {
  if (type === 'success') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
        <circle cx="8" cy="8" r="7" stroke={color} strokeWidth="1.5"/>
        <path d="M5 8l2 2 4-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
      <circle cx="8" cy="8" r="7" stroke={color} strokeWidth="1.5"/>
      <path d="M8 5v3.5M8 10.5v.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
