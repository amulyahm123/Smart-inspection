import { useState } from 'react'
import { Plus, Trash2, AlertTriangle, Clock } from 'lucide-react'
import Badge from '../ui/Badge'
import IssueForm from './IssueForm'
import { severityTone } from '../../utils/status'

export default function IssuesStep({ site, insp, summary }) {
  const { draft, removeIssue, next, back } = insp
  const [preset, setPreset] = useState(null)
  const p = summary.progress // only present for construction
  const showDelay = p && p.diff < 0 && !draft.issues.some((i) => i.itemId === 'progress')

  return (
    <>
      {showDelay && (
        <section className="card" style={{ marginBottom: 14, borderColor: 'var(--orange)' }}>
          <b style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Clock size={17} /> Project is {p.text}</b>
          <p className="muted small" style={{ margin: '4px 0 10px' }}>Report a progress issue so the project team is notified.</p>
          <button className="btn btn-ghost" onClick={() => setPreset({
            itemId: 'progress', item: 'Project progress', category: 'Progress', severity: p.diff <= -10 ? 'High' : 'Medium',
            title: `Behind schedule by ${-p.diff}% in ${p.phase} phase`,
          })}>
            <AlertTriangle size={15} /> Report delay issue
          </button>
        </section>
      )}

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-head">
          <h2>Issues found ({draft.issues.length})</h2>
          <button className="btn btn-ghost" onClick={() => setPreset({})}><Plus size={16} /> Add other issue</button>
        </div>
        <p className="muted small" style={{ marginBottom: 8 }}>Issues you save here are sent to Alerts when you submit the inspection.</p>
        {draft.issues.length === 0 && <p className="muted">No issues reported yet.</p>}
        {draft.issues.map((is) => {
          const photos = draft.evidence.filter((e) => e.link.type === 'issue' && e.link.ref === is.id).length
          return (
            <div className="list-row" key={is.id}>
              <div className="grow">
                <b>{is.title}</b>
                <div className="muted small">{is.category} · {is.location} · {is.team} · {photos} photo{photos === 1 ? '' : 's'}</div>
                <div className="pill-row" style={{ marginTop: 5 }}>
                  <Badge tone={severityTone[is.severity]}>{is.severity}</Badge>
                  {is.recurring && <Badge tone="orange">Recurring issue – escalation recommended</Badge>}
                </div>
              </div>
              <button className="btn btn-ghost" style={{ padding: 7 }} onClick={() => removeIssue(is.id)} aria-label={`Remove ${is.title}`}><Trash2 size={16} /></button>
            </div>
          )
        })}
      </div>

      {summary.unreported.length > 0 && (
        <section className="card" style={{ marginBottom: 14 }}>
          <h2>Flagged items without an issue</h2>
          <p className="muted small">Optional – report an issue so the responsible team is notified.</p>
          {summary.unreported.map((item) => (
            <div className="list-row" key={item.id}>
              <div className="grow"><b>{item.label}</b><div className="muted small">{item.category}</div></div>
              <Badge tone={item.level === 'fail' ? 'red' : 'amber'}>{item.level === 'fail' ? 'Fail' : 'Attention'}</Badge>
              <button className="btn btn-ghost" style={{ padding: '6px 12px' }}
                onClick={() => setPreset({ itemId: item.id, item: item.label, category: item.category, severity: item.level === 'fail' ? 'High' : 'Medium' })}>
                <AlertTriangle size={15} /> Report
              </button>
            </div>
          ))}
        </section>
      )}

      <div className="action-bar">
        <button className="btn btn-ghost" onClick={back}>Back to evidence</button>
        <button className="btn" onClick={next}>Continue to summary</button>
      </div>
      {preset && <IssueForm site={site} preset={preset} insp={insp} onClose={() => setPreset(null)} />}
    </>
  )
}
