import { useState } from 'react'
import { RefreshCw, ShieldAlert, Info } from 'lucide-react'
import Badge from '../ui/Badge'
import { RiskGauge, ConfidenceBadge } from './RiskVisuals'
import RiskTrend from './RiskTrend'
import { getRiskHistory, getRiskTrend, getRiskConfig, recalculateRisk, REASON_LABEL } from '../../services/riskService'
import { FACTOR_KEYS, FACTOR_LABELS } from '../../services/risk/riskConfig.js'
import { RISK_TONE, TREND_META, priorityText, priorityTone } from '../../utils/risk'
import { formatDate, formatDateTime } from '../../utils/date'

const STATUS_LABEL = { scored: 'Scored', 'not-applicable': 'Not applicable', 'no-data': 'No data' }
const STATUS_TONE = { scored: 'blue', 'not-applicable': 'gray', 'no-data': 'amber' }

// Full explanation of one site's risk score (Site details page).
export default function RiskPanel({ site, risk, isAdmin, actor, onChanged, onMessage }) {
  const [busy, setBusy] = useState(false)
  const cfg = getRiskConfig()
  if (!risk) {
    return <section className="card section"><h2>Risk score</h2><div className="empty-inline"><b>No risk score yet.</b><span className="muted"> Archived sites are not scored. Restore the site or press Recalculate.</span></div></section>
  }
  const history = getRiskHistory(site.id)
  const trend = getRiskTrend(site.id)
  const meta = TREND_META[trend.direction]
  const f = risk.facts

  const recalc = async () => {
    setBusy(true)
    try { recalculateRisk(site.id, actor); onMessage('Risk score recalculated.'); onChanged() } catch (e) { onMessage(e.message, 'error') }
    setBusy(false)
  }

  const delay = f.progress
    ? [f.progress.gap > 0 ? `${f.progress.gap}% behind expected (actual ${f.progress.actual}% vs expected ${f.progress.expected}%)` : 'On or ahead of schedule', f.progress.pastDeadline ? `deadline passed ${f.progress.daysPastDeadline} day(s) ago` : null, f.progress.lateStartDays ? `start is ${f.progress.lateStartDays} day(s) late` : null].filter(Boolean).join('; ')
    : (risk.factors.progress.note || 'Not available')

  return (
    <section className="card section risk-panel">
      <div className="card-head">
        <h2 style={{ margin: 0 }}><ShieldAlert size={18} style={{ verticalAlign: '-3px' }} /> Risk score</h2>
        {isAdmin && <button className="btn btn-ghost" onClick={recalc} disabled={busy}><RefreshCw size={16} /> {busy ? 'Calculating…' : 'Recalculate risk score'}</button>}
      </div>

      <div className="risk-head">
        <RiskGauge risk={risk} />
        <div className="risk-head-text">
          <div className="pill-row">
            <Badge tone={RISK_TONE[risk.level]}>{risk.levelLabel}</Badge>
            <ConfidenceBadge confidence={risk.confidence} />
            <Badge tone={priorityTone(risk)}>{priorityText(risk)}</Badge>
          </div>
          <p style={{ margin: '10px 0 4px', fontWeight: 600 }}>{risk.summary}</p>
          <p className="muted small" style={{ margin: 0 }}>Last updated {formatDateTime(risk.calculatedAt)} · {REASON_LABEL[risk.reason] || 'Recalculated'}</p>
          <p className="small" style={{ margin: '8px 0 0' }}>{risk.recommendation} <span className="muted">{risk.recommendationNote}</span></p>
        </div>
      </div>

      {risk.confidence !== 'high' && risk.limitations.length > 0 && (
        <div className="warn" style={{ marginTop: 12 }}>
          <b><Info size={14} style={{ verticalAlign: '-2px' }} /> {risk.confidence === 'low' ? 'Limited data – this score is a rough guide only.' : 'Some data is missing, so only the available factors were used.'}</b>
          <ul className="small" style={{ margin: '6px 0 0', paddingLeft: 18 }}>{risk.limitations.map((l) => <li key={l}>{l}</li>)}</ul>
        </div>
      )}

      <dl className="kv risk-facts" style={{ marginTop: 14 }}>
        <div><dt>Unresolved critical issues</dt><dd>{f.unresolvedCritical}{f.overdueCritical > 0 && <span className="bad"> ({f.overdueCritical} past deadline)</span>}</dd></div>
        <div><dt>Unresolved major (high) issues</dt><dd>{f.unresolvedMajor}</dd></div>
        <div><dt>Missed inspections (last {cfg.inspections.windowDays} days)</dt><dd>{risk.factors.inspections.status === 'scored' ? f.missed : '–'}</dd></div>
        <div><dt>Overdue inspections</dt><dd>{risk.factors.inspections.status === 'scored' ? f.overdue : '–'}{f.overdueDays > 0 && ` (up to ${f.overdueDays} days late)`}</dd></div>
        <div><dt>Project delay</dt><dd>{delay}</dd></div>
        <div><dt>Last successful inspection</dt><dd>{f.lastSuccessfulInspection ? formatDate(f.lastSuccessfulInspection) : 'No successful inspection yet'}</dd></div>
        <div><dt>GPS verification</dt><dd>{risk.factors.attendance.status === 'scored' ? `${f.failedGps} unresolved failure(s)` : 'No usable GPS data'}{f.gpsUnavailable > 0 && ` · ${f.gpsUnavailable} visit(s) without GPS record (not penalised)`}</dd></div>
        <div><dt>Missed attendance (no-shows)</dt><dd>{f.noShows} <span className="muted small">(counted under missed inspections)</span></dd></div>
      </dl>

      <h3 style={{ margin: '18px 0 8px' }}>Why this score</h3>
      {risk.reasons.length === 0
        ? <p className="muted small">No risk factors were found in the available records.</p>
        : <ul className="risk-reasons">{risk.reasons.map((r) => <li key={`${r.factor}-${r.text}`}><b>{FACTOR_LABELS[r.factor]}</b> – {r.text}</li>)}</ul>}

      <div className="risk-factors">
        {FACTOR_KEYS.map((k) => {
          const fc = risk.factors[k]
          const pct = fc.status === 'scored' ? Math.round((fc.points / fc.weight) * 100) : 0
          return (
            <div className="risk-factor" key={k}>
              <div className="risk-factor-top">
                <span>{fc.label}</span>
                <span className="muted small">{fc.status === 'scored' ? `${fc.points.toFixed(1)} of ${fc.weight} pts` : `weight ${fc.weight}`}</span>
                <Badge tone={STATUS_TONE[fc.status]}>{STATUS_LABEL[fc.status]}</Badge>
              </div>
              <div className="risk-bar-track"><span style={{ width: `${pct}%`, background: pct >= 70 ? 'var(--red)' : pct >= 35 ? '#e0a82f' : 'var(--green)' }} /></div>
              {fc.status !== 'scored' && fc.note && <div className="muted small">{fc.note}</div>}
            </div>
          )
        })}
      </div>

      <h3 style={{ margin: '20px 0 8px' }}>Risk trend</h3>
      <div className="pill-row" style={{ marginBottom: 8 }}>
        <Badge tone={meta.tone}>{meta.arrow} {meta.label}</Badge>
        {trend.previous && <span className="small">Now <b>{trend.current.score}</b> vs previous <b>{trend.previous.score}</b> ({trend.delta > 0 ? '+' : ''}{trend.delta}) recorded {formatDate(trend.previous.date)}</span>}
      </div>
      {history.length < 2 && <p className="muted small">History is recorded from the day this feature was introduced{trend.since ? ` (first score ${formatDate(trend.since)})` : ''}. The chart fills in as the site is inspected and updated – no past scores are estimated.</p>}
      <RiskTrend history={history} limits={cfg.levels} />
      <div className="table-wrap" style={{ marginTop: 8 }}>
        <table>
          <thead><tr><th>Recorded</th><th>Score</th><th>Level</th><th>Confidence</th><th>Reason</th></tr></thead>
          <tbody>{history.slice().reverse().slice(0, 10).map((h) => (
            <tr key={h.id}><td>{formatDateTime(h.at)}</td><td><b>{h.score}</b></td><td><Badge tone={RISK_TONE[h.level]}>{h.level}</Badge></td><td>{h.confidence}</td><td>{REASON_LABEL[h.reason] || '–'}</td></tr>
          ))}</tbody>
        </table>
      </div>

      <details style={{ marginTop: 14 }}>
        <summary className="small" style={{ cursor: 'pointer' }}><b>How is this calculated?</b></summary>
        <FormulaNote cfg={cfg} />
      </details>
    </section>
  )
}

export function FormulaNote({ cfg }) {
  return (
    <div className="small" style={{ marginTop: 8 }}>
      <p>Rule-based and explainable – not a machine-learning model. Score = Σ factor points ÷ Σ weights of the factors that have data × 100, kept between 0 and 100. Factors with no data or not applicable are left out (never counted as zero risk) and lower the data confidence.</p>
      <ul style={{ paddingLeft: 18 }}>
        {FACTOR_KEYS.map((k) => <li key={k}>{FACTOR_LABELS[k]}: up to {cfg.weights[k]} points</li>)}
      </ul>
      <p>Levels: Low 0–{cfg.levels.lowMax} · Medium {cfg.levels.lowMax + 1}–{cfg.levels.mediumMax} · High {cfg.levels.mediumMax + 1}–100.</p>
    </div>
  )
}
