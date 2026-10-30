import { createContext, useCallback, useContext, useState } from 'react'
import { createPortal } from 'react-dom'

// Minimal toast system — a context provider plus a fixed, portalled stack.
// Call const toast = useToast(); toast.success('…') / .error('…') / .info('…').

const ToastContext = createContext(() => {})

export function useToast() {
  return useContext(ToastContext)
}

let nextId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (type, message, duration = 4000) => {
      const id = ++nextId
      setToasts((list) => [...list, { id, type, message }])
      if (duration) setTimeout(() => remove(id), duration)
      return id
    },
    [remove]
  )

  // Stable helper object so consumers can call toast.success(...) etc.
  const toast = {
    success: (m, d) => push('success', m, d),
    error: (m, d) => push('error', m, d),
    info: (m, d) => push('info', m, d),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div className="toast-stack" role="status" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={`toast toast-${t.type}`}>
              <span className="toast-icon" aria-hidden="true">
                {t.type === 'success' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                ) : t.type === 'error' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 16v-4M12 8h.01" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                )}
              </span>
              <span className="toast-msg">{t.message}</span>
              <button
                type="button"
                className="toast-close"
                aria-label="Dismiss"
                onClick={() => remove(t.id)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}
