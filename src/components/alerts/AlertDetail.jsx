import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { X, Repeat2, TrendingUp, Video, ArrowRight, Check } from 'lucide-react'
import Badge from '../ui/Badge'
import LifecycleStepper from './LifecycleStepper'
import { ALERT_META, STATUS_TONE } from './alertMeta'
import { ISSUE_FLOW, updateIssueStatus, updateAlertStatus } from '../../services/dataService'
import { acknowledgeRiskAlert } from '../../services/riskService'
import { severityTone, issueTone } from '../../utils/status'
import { sitePath } from '../../utils/paths'
import { formatDateTime, formatDate, relTime } from '../../utils/date'

// Full details of one alert. Admin can move an issue through its lifecycle from here.
export default function AlertDetail({ alert: a, user, onClose, onChanged }) {
  const closeRef = useRef(null)
  const isAdmin = user.role === 'admin'
  const meta = ALERT_META[a.kind]
  const Icon = meta.icon
  const iso = new Date(a.at).toISOString()

  useEffect(() => {
    if (closeRef.current) closeRef.current.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const change = (fn) => { try { fn() } catch (e) { window.alert(e.message) } onChanged() }
  const rows = [
    ['Alert type', a.typeLabel], ['Site / project', a.siteName], ...(a.inspectorId ? [['Inspector', a.inspectorName]] : []),
    ['Date / time', a.dateOnly ? formatDate(iso.slice(0, 10)) : formatDateTime(iso)], ['Raised', relTime(a.at)],
  ]
  if (a.issue) rows.push(['Category', a.issue.category], ['Responsible team', a.issue.team], ['Location', a.issue.location || 'Not specified'])

  const flowIdx = a.issue ? ISSUE_FLOW.indexOf(a.issue.status) : -1
  const next = ISSUE_FLOW[flowIdx + 1]

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" role="dialog" aria-label="Alert details" onClick={(e) => e.stopPropagation()}>
        <div className="card-head" style={{ alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <span className={`alert-ico tone-${meta.tone}`}><Icon size={22} /></span>
            <div>
              <h2>{a.title}</h2>
              <div className="pill-row" style={{ marginTop: 6 }}>
                <Badge tone={severityTone[a.severity]}>{a.severity}</Badge>
                <Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge>
                {a.recurring && <Badge tone="orange"><Repeat2 size={12} /> Recurring Issue ×{a.recurrenceCount}</Badge>}
              </div>
            </div>
          </div>
          <button ref={closeRef} className="btn btn-ghost" style={{ padding: 7 }} onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        {a.escalated && (
          <div className="warn red">
            <b style={{ display: 'flex', gap: 6, alignItems: 'center' }}><TrendingUp size={16} /> {a.escalationLevel}</b>
            <div className="small" style={{ marginTop: 3 }}>
              This problem has been reported {a.recurrenceCount} times at {a.siteName} and is still unresolved. Escalation is recommended.
            </div>
          </div>
        )}

        {a.issue && (
          <section style={{ marginTop: 14 }}>
            <b className="small" style={{ color: 'var(--ink-soft)' }}>Issue lifecycle</b>
            <LifecycleStepper status={a.issue.status} />
            {isAdmin ? (
              <div className="status-controls">
                {next ? <button className="btn" onClick={() => change(() => updateIssueStatus(a.issueId, next))}>Move to {next} <ArrowRight size={15} /></button>
                  : <span className="muted small"><Check size={14} /> Final stage reached</span>}
                <label className="inline-label">Set status
                  <select value={a.issue.status} onChange={(e) => change(() => updateIssueStatus(a.issueId, e.target.value))}>
                    {ISSUE_FLOW.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </label>
              </div>
            ) : <p className="muted small" style={{ marginTop: 8 }}>Only an admin can change the status. You will get a notification when it moves.</p>}
            {a.issue.description && <p style={{ marginTop: 12 }}>{a.issue.description}</p>}
          </section>
        )}

        {a.related && a.related.length > 0 && (
          <section style={{ marginTop: 14 }}>
            <b className="small" style={{ color: 'var(--ink-soft)' }}>Earlier reports of the same problem</b>
            {a.related.map((r) => (
              <div className="list-row" key={r.id}>
                <div className="grow"><b>{r.title}</b><div className="muted small">{r.id} · {r.daysAgo === 0 ? 'today' : `${r.daysAgo} days ago`}</div></div>
                <Badge tone={issueTone[r.status]}>{r.status}</Badge>
              </div>
            ))}
          </section>
        )}

        {a.kind === 'cctv' && (
          <section style={{ marginTop: 14 }}>
            <p className="muted">Detected by camera {a.cameraId}{a.confidence ? ` (${a.confidence}% confidence)` : ''}. Open the live view to check the feed.</p>
            <div className="status-controls">
              <Link className="btn btn-ghost" to={`/${user.role}/cctv?camera=${a.cameraId}`}><Video size={15} /> Open camera</Link>
              {isAdmin && a.cctv.status === 'open' && <button className="btn btn-ghost" onClick={() => change(() => updateAlertStatus(a.cctv.id, 'pending'))}>Acknowledge</button>}
              {isAdmin && a.cctv.status !== 'resolved' && <button className="btn" onClick={() => change(() => updateAlertStatus(a.cctv.id, 'resolved'))}>Resolve alert</button>}
            </div>
          </section>
        )}

        {a.kind === 'delayed' && (
          <section style={{ marginTop: 14 }}>
            <p className="muted">{a.progress.phase} phase: expected {a.progress.expected}%, actual {a.progress.actual}% ({a.progress.diff}%). This alert clears automatically when a later inspection records progress back on track.</p>
          </section>
        )}
        {a.kind === 'risk' && (
          <section style={{ marginTop: 14 }}>
            <p>{a.detail}</p>
            <p className="muted small" style={{ marginTop: 6 }}>{a.risk.summary} Data confidence: {a.risk.confidence}. {a.risk.recommendation} {a.risk.recommendationNote}</p>
            {a.status === 'Acknowledged' && <p className="small" style={{ marginTop: 6 }}><Check size={14} /> Acknowledged {formatDateTime(a.acknowledgedAt)}. It stays listed while the condition lasts, and returns as Open if the condition changes.</p>}
            {isAdmin && a.status === 'Open' && <div className="status-controls"><button className="btn" onClick={() => change(() => acknowledgeRiskAlert(a.id, user))}><Check size={15} /> Acknowledge</button></div>}
          </section>
        )}
        {a.kind === 'missed' && <p className="muted" style={{ marginTop: 14 }}>The scheduled inspection ({a.inspection.slot}) was not completed. Reassign it or ask {a.inspectorName} to inspect as soon as possible.</p>}
        {a.kind === 'pending' && <p className="muted" style={{ marginTop: 14 }}>Scheduled for {a.inspection.slot}. {a.severity === 'Medium' ? 'The slot has started and the inspection is not done yet.' : 'It is due today.'} This alert clears when the inspection is completed.</p>}

        {user.role === 'inspector' && a.kind !== 'cctv' && a.kind !== 'risk' && (
          <div className="status-controls"><Link className="btn" to={sitePath({ id: a.siteId, type: a.kind === 'delayed' || a.siteId.startsWith('P-') ? 'construction' : 'existing' })} onClick={onClose}>Open {a.siteId.startsWith('P-') ? 'project' : 'site'} <ArrowRight size={15} /></Link></div>
        )}

        {isAdmin && (
          <div className="status-controls">
            <Link className="btn btn-ghost" to={`/admin/sites/${a.siteId}`} onClick={onClose}>View site / project</Link>
            {a.inspectorId && <Link className="btn btn-ghost" to={`/admin/officers/${a.inspectorId}`} onClick={onClose}>View inspector</Link>}
          </div>
        )}

        <dl className="kv" style={{ marginTop: 16 }}>{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      </div>
    </div>
  )
}
