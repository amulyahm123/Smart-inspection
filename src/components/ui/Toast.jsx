import { useEffect } from 'react'

// Small message at the bottom of the screen. tone: 'ok' | 'error'
export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined
    const t = setTimeout(onClose, toast.tone === 'error' ? 7000 : 4000)
    return () => clearTimeout(t)
  }, [toast, onClose])
  if (!toast) return null
  return (
    <div className="toast" role={toast.tone === 'error' ? 'alert' : 'status'} style={toast.tone === 'error' ? { background: '#7d241b' } : undefined}>
      {toast.text}
    </div>
  )
}
