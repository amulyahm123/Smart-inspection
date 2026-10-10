import { Send } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { submitInspection } from '../../services/dataService'
import { formatDateTime } from '../../utils/date'
import { severityTone } from '../../utils/status'
import Badge from '../ui/Badge'

export default function SummaryStep({ site, insp, summary }) {
  const { user } = useAuth()
  const { draft, back, markSubmitted } = insp
  const { overall } = summary

  const submit = () => markSubmitted(submitInspection(draft, summary))

  const rows = [
    ['Site', site.name], ['Inspector', `${user.name} (${user.officerId})`],
    ['Check-in', `${formatDateTime(draft.checkIn.time)} · GPS verified`], ['Check-out', 'Recorded after you submit'],
    ['Checklist completion', `${summary.percent}% (${summary.answered}/${summary.total})`], ['Evidence captured', `${summary.evidence} photos`],
    ['Issues found', summary.issues], ['Critical issues', summary.critical],
  ]

  return (
    <>
      <section className={`card status-banner tone-${overall.tone}`}>
        <div style={{ fontSize: '1.8rem' }}>{overall.emoji}</div>
        <div>
          <b style={{ fontSize: '1.1rem' }}>Overall: {overall.label}</b>
          <div className="small">Open issues: {summary.issues} · Critical: {summary.critical} · Fail: {summary.fail} · Attention: {summary.attention}</div>
        </div>
      </section>

      <section className="card section">
        <h2 style={{ marginBottom: 10 }}>Inspection summary</h2>
        <dl className="kv">
          {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
        </dl>
      </section>

      <section className="card section table-wrap">
        <h2 style={{ marginBottom: 8 }}>By category</h2>
        <table>
          <thead><tr><th>Category</th><th>Pass</th><th>Attention</th><th>Fail</th></tr></thead>
          <tbody>
            {summary.byCategory.map((c) => (
              <tr key={c.name}><td>{c.name}</td><td>{c.pass}</td><td>{c.attention}</td><td>{c.fail}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      {draft.issues.length > 0 && (
        <section className="card section">
          <h2>Issues to be reported</h2>
          {draft.issues.map((is) => (
            <div className="list-row" key={is.id}>
              <div className="grow"><b>{is.title}</b><div className="muted small">{is.category} · {is.team}</div></div>
              <Badge tone={severityTone[is.severity]}>{is.severity}</Badge>
            </div>
          ))}
        </section>
      )}

      {summary.unreported.length > 0 && (
        <div className="warn section">{summary.unreported.length} flagged item(s) have no issue reported. You can still submit, or go back to report them.</div>
      )}

      <div className="action-bar">
        <button className="btn btn-ghost" onClick={back}>Back to issues</button>
        <button className="btn" disabled={summary.remaining > 0} onClick={submit}><Send size={16} /> Submit inspection</button>
      </div>
      {summary.remaining > 0 && <p className="muted small" style={{ textAlign: 'right', marginTop: 8 }}>Finish the checklist ({summary.remaining} items left) before submitting.</p>}
      <p className="muted small" style={{ textAlign: 'right', marginTop: 8 }}>After submitting you will GPS check out to complete the inspection.</p>
    </>
  )
}
