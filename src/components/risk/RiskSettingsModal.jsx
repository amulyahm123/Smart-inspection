import { useState } from 'react'
import { Dialog } from '../sites/Dialog'
import { getRiskConfig, saveRiskConfig, resetRiskConfig, DEFAULT_RISK_CONFIG } from '../../services/riskService'
import { FACTOR_KEYS, FACTOR_LABELS } from '../../services/risk/riskConfig.js'

// Admin: change the factor weights and the Low / Medium limits. All scores are recalculated on save.
export default function RiskSettingsModal({ actor, onClose, onSaved }) {
  const cfg = getRiskConfig()
  const [w, setW] = useState(() => Object.fromEntries(FACTOR_KEYS.map((k) => [k, String(cfg.weights[k])])))
  const [lv, setLv] = useState({ lowMax: String(cfg.levels.lowMax), mediumMax: String(cfg.levels.mediumMax) })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const sum = FACTOR_KEYS.reduce((s, k) => s + (Number(w[k]) || 0), 0)

  const save = () => {
    setBusy(true); setError('')
    try {
      saveRiskConfig({ weights: Object.fromEntries(FACTOR_KEYS.map((k) => [k, Number(w[k])])), levels: { lowMax: Number(lv.lowMax), mediumMax: Number(lv.mediumMax) } }, actor)
      onSaved('Risk settings saved and all scores recalculated.')
    } catch (e) { setError(e.message); setBusy(false) }
  }
  const reset = () => {
    setBusy(true)
    try { resetRiskConfig(actor); onSaved('Risk settings reset to the defaults.') } catch (e) { setError(e.message); setBusy(false) }
  }

  return (
    <Dialog title="Risk score settings" onClose={onClose} busy={busy}>
      <div className="form-grid">
        <p className="muted small" style={{ margin: 0 }}>Maximum points each factor can add. They must add up to 100. The default is {FACTOR_KEYS.map((k) => DEFAULT_RISK_CONFIG.weights[k]).join(' / ')}.</p>
        {FACTOR_KEYS.map((k) => (
          <label key={k}><span>{FACTOR_LABELS[k]}</span><input type="number" min="0" max="100" step="1" value={w[k]} onChange={(e) => setW({ ...w, [k]: e.target.value })} disabled={busy} /></label>
        ))}
        <div className={sum === 100 ? 'muted small' : 'bad small'}>Total: {sum} / 100</div>
        <div className="form-2">
          <label><span>Low risk up to</span><input type="number" min="1" max="98" value={lv.lowMax} onChange={(e) => setLv({ ...lv, lowMax: e.target.value })} disabled={busy} /></label>
          <label><span>Medium risk up to</span><input type="number" min="2" max="99" value={lv.mediumMax} onChange={(e) => setLv({ ...lv, mediumMax: e.target.value })} disabled={busy} /></label>
        </div>
        {error && <div className="warn red" role="alert">{error}</div>}
        <div className="action-bar">
          <button className="btn btn-ghost" onClick={reset} disabled={busy}>Reset to defaults</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
            <button className="btn" onClick={save} disabled={busy || sum !== 100}>{busy ? 'Saving…' : 'Save & recalculate'}</button>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
