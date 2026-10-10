import { useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw, Settings2, ShieldCheck } from 'lucide-react'
import Badge from '../ui/Badge'
import { RiskBar } from './RiskVisuals'
import RiskSettingsModal from './RiskSettingsModal'
import { getAllRisks, getRiskTrend, recalculateRisk } from '../../services/riskService'
import { TREND_META, priorityText, priorityTone } from '../../utils/risk'
import { formatDateTime } from '../../utils/date'

const TABS = [
  ['all', 'All sites', () => true],
  ['high', 'High', (r) => r.level === 'high'],
  ['medium', 'Medium', (r) => r.level === 'medium'],
  ['low', 'Low', (r) => r.level === 'low'],
  ['immediate', 'Needs immediate inspection', (r) => r.needsImmediate],
  ['overdue', 'Overdue / missed inspections', (r) => r.facts.overdue > 0 || r.facts.missed > 0],
  ['critical', 'Unresolved critical issues', (r) => r.facts.unresolvedCritical > 0],
]

// Admin Dashboard: every active site ranked by risk (highest first) with the reason behind each score.
export default function HighRiskSites({ user, onMessage }) {
  const [tab, setTab] = useState('all')
  const [all, setAll] = useState(false)
  const [settings, setSettings] = useState(false)
  const [busy, setBusy] = useState(false)
  const [, setV] = useState(0)
  const refresh = () => setV((v) => v + 1)

  const rows = getAllRisks().filter((x) => x.risk).sort((a, b) => b.risk.score - a.risk.score || a.site.name.localeCompare(b.site.name))
  const test = TABS.find((t) => t[0] === tab)[2]
  const shown = rows.filter((x) => test(x.risk))
  const visible = all ? shown : shown.slice(0, 8)
  const updated = rows.reduce((m, x) => (x.risk.calculatedAt > m ? x.risk.calculatedAt : m), '')

  const recalcAll = () => {
    setBusy(true)
    try { recalculateRisk(null, user); onMessage('All risk scores recalculated.'); refresh() } catch (e) { onMessage(e.message, 'error') }
    setBusy(false)
  }

  return (
    <section className="card section" aria-labelledby="hr-title">
      <div className="card-head" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 id="hr-title" style={{ margin: 0 }}>High-risk sites</h2>
          <div className="muted small">Rule-based risk score (0–100), highest first{updated ? ` · updated ${formatDateTime(updated)}` : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={recalcAll} disabled={busy}><RefreshCw size={15} /> {busy ? 'Calculating…' : 'Recalculate all'}</button>
          <button className="btn btn-ghost" onClick={() => setSettings(true)}><Settings2 size={15} /> Settings</button>
        </div>
      </div>

      <div className="cat-tabs" role="tablist" aria-label="Filter by risk">
        {TABS.map(([key, label, fn]) => (
          <button key={key} role="tab" aria-selected={tab === key} className={`cat-tab ${tab === key ? 'on' : ''}`} onClick={() => { setTab(key); setAll(false) }}>{label} ({rows.filter((x) => fn(x.risk)).length})</button>
        ))}
      </div>

      {shown.length === 0 && <div className="empty-inline"><ShieldCheck size={16} style={{ verticalAlign: '-3px' }} /> <b>No sites in this group.</b><span className="muted"> Nothing matches this filter right now.</span></div>}
      <div className="risk-list">
        {visible.map(({ site, risk }) => {
          const t = TREND_META[getRiskTrend(site.id).direction]
          return (
            <Link to={`/admin/sites/${site.id}`} className="risk-row" key={site.id}>
              <div className="risk-row-main">
                <b>{site.name}</b>
                <div className="muted small">{site.id} · {site.area}</div>
                <div className="small risk-row-why">{risk.reasons.length ? risk.reasons.slice(0, 2).map((r) => r.text).join(' · ') : risk.confidence === 'low' ? 'Not enough data to assess yet' : 'No risk factors found'}</div>
              </div>
              <div className="risk-row-score"><RiskBar risk={risk} /></div>
              <div className="risk-row-tags">
                <Badge tone={priorityTone(risk)}>{priorityText(risk)}</Badge>
                <span className="muted small" title={`Trend: ${t.label}`}>{t.arrow} {t.label === 'Not enough history yet' ? 'new' : t.label.toLowerCase()}</span>
              </div>
            </Link>
          )
        })}
      </div>
      {shown.length > 8 && <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => setAll(!all)}>{all ? 'Show top 8' : `Show all ${shown.length}`}</button>}
      <p className="muted small" style={{ marginTop: 10 }}>* limited data. Recommendations are advisory and never override statutory inspection schedules or administrative decisions. See <Link to="/admin/sites">Sites</Link> to sort and filter every site by risk.</p>

      {settings && <RiskSettingsModal actor={user} onClose={() => setSettings(false)} onSaved={(m) => { setSettings(false); onMessage(m); refresh() }} />}
    </section>
  )
}
