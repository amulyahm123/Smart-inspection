import { Send } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { submitInspection } from '../../services/dataService'
import { formatDateTime } from '../../utils/date'
import { severityTone } from '../../utils/status'
import Badge from '../ui/Badge'

export default function ConstructionSummaryStep({ site, insp, summary }) {
  const { user } = useAuth()
  const { draft, back, markSubmitted } = insp
  const { progress, quality, issuesInd, overall } = summary
  const submit = () => markSubmitted(submitInspection(draft, summary))

  const rows = [
    ['Project', site.name], ['Inspector', `${user.name} (${user.officerId})`],
    ['Check-in', `${formatDateTime(draft.checkIn.time)} · GPS verified`], ['Check-out', 'Recorded after you submit'],
    ['Current phase', progress.phase], ['Checklist & materials', `${summary.percent}% complete (${summary.answered}/${summary.total})`],
    ['Evidence captured', `${summary.evidence} photos`], ['Critical issues', summary.critical],
  ]

  return (
    <>
      <div className="grid grid-3">
        <section className={`card indicator tone-${progress.tone}`}>
          <span className="small">Progress</span>
          <b>{progress.emoji} {progress.text}</b>
          <span className="small">{progress.status} · expected {progress.expected}%, actual {progress.actual}%</span>
        </section>
        <section className={`card indicator tone-${quality.tone}`}>
          <span className="small">Quality</span>
          <b>{quality.emoji} {quality.label}</b>
          <span className="small">Materials: {summary.matOk}/{summary.materialTotal} acceptable · Work: {summary.workPass}/{summary.workTotal} pass</span>
        </section>
        <section className={`card indicator tone-${issuesInd.tone}`}>
          <span className="small">Issues</span>
          <b>{issuesInd.emoji} {issuesInd.label}</b>
          <span className="small">{issuesInd.critical} critical</span>
        </section>
      </div>

      <section className={`card status-banner tone-${overall.tone} section`}>
        <div style={{ fontSize: '1.8rem' }}>{overall.emoji}</div>
        <div><b style={{ fontSize: '1.1rem' }}>Overall: {overall.label}</b>
          <div className="small">Progress: {progress.emoji} {progress.diff > 0 ? '+' : ''}{progress.diff}% · Quality: {quality.emoji} {quality.label} · Open issues: {summary.issues}</div></div>
      </section>

      <section className="card section">
        <h2 style={{ marginBottom: 10 }}>Inspection summary</h2>
        <dl className="kv">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        {draft.progress.notes && <p className="muted small" style={{ marginTop: 12 }}>Remarks: {draft.progress.notes}</p>}
      </section>

      {summary.flagged.length > 0 && (
        <section className="card section">
          <h2>Items needing follow-up</h2>
          {summary.flagged.map((it) => (
            <div className="list-row" key={it.id}>
              <div className="grow"><b>{it.label}</b><div className="muted small">{it.source === 'material' ? 'Material' : 'Work'}</div></div>
              <Badge tone={it.level === 'fail' ? 'red' : 'amber'}>{it.source === 'material' ? (it.level === 'fail' ? 'Not acceptable' : 'Needs attention') : (it.level === 'fail' ? 'Fail' : 'Attention')}</Badge>
            </div>
          ))}
        </section>
      )}

      {draft.issues.length > 0 && (
        <section className="card section">
          <h2>Issues to be reported</h2>
          {draft.issues.map((is) => (
            <div className="list-row" key={is.id}>
              <div className="grow"><b>{is.title}</b><div className="muted small">{is.category} · {is.team}{is.recurring ? ' · Recurring issue' : ''}</div></div>
              <Badge tone={severityTone[is.severity]}>{is.severity}</Badge>
            </div>
          ))}
        </section>
      )}

      {summary.unreported.length > 0 && <div className="warn section">{summary.unreported.length} flagged item(s) have no issue reported. You can still submit, or go back to report them.</div>}

      <div className="action-bar">
        <button className="btn btn-ghost" onClick={back}>Back to issues</button>
        <button className="btn" disabled={summary.remaining > 0} onClick={submit}><Send size={16} /> Submit inspection</button>
      </div>
      {summary.remaining > 0 && <p className="muted small" style={{ textAlign: 'right', marginTop: 8 }}>Finish the checklist and material check ({summary.remaining} items left) before submitting.</p>}
      <p className="muted small" style={{ textAlign: 'right', marginTop: 8 }}>After submitting you will GPS check out to complete the inspection.</p>
    </>
  )
}
