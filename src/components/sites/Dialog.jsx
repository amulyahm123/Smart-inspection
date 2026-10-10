import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

// Basic modal (uses the existing .modal styles). Closes on Escape.
export function Dialog({ title, onClose, children, wide, busy }) {
  const ref = useRef(null)
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose() }
    window.addEventListener('keydown', onKey)
    if (ref.current) ref.current.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, busy])
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose() }}>
      <div className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="card-head">
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button className="btn btn-ghost" style={{ padding: 6 }} onClick={onClose} disabled={busy} aria-label="Close"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ConfirmDialog({ title, children, confirmLabel, danger, busy, error, onConfirm, onClose, extra }) {
  return (
    <Dialog title={title} onClose={onClose} busy={busy}>
      <div className="form-grid">
        <div>{children}</div>
        {error && <div className="warn red" role="alert">{error}</div>}
        <div className="action-bar" style={{ marginTop: 4 }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {extra}
            {onConfirm && <button className="btn" style={danger ? { background: 'var(--red)' } : undefined} onClick={onConfirm} disabled={busy}>{busy ? 'Please wait…' : confirmLabel}</button>}
          </div>
        </div>
      </div>
    </Dialog>
  )
}
