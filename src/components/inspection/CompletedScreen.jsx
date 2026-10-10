import { useNavigate } from 'react-router-dom'
import { CheckCheck } from 'lucide-react'
import { durationText, formatDateTime } from '../../utils/date'
import { listPath } from '../../utils/paths'
import Badge from '../ui/Badge'

export default function CompletedScreen({ site, insp, summary }) {
  const navigate = useNavigate()
  const { draft, clear } = insp
  const leave = (to) => { clear(); navigate(to) }
  const { progress, quality } = summary
  return (
    <section className="card" style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
      <div className="success-mark"><CheckCheck size={32} /></div>
      <h1>Inspection completed</h1>
      <p className="muted" style={{ margin: '6px 0 16px' }}>{site.name} · Ref {draft.recordId}</p>
      <dl className="kv" style={{ textAlign: 'left' }}>
        <div><dt>Checked in</dt><dd>{formatDateTime(draft.checkIn.time)}</dd></div>
        <div><dt>Checked out</dt><dd>{formatDateTime(draft.checkOut.time)}</dd></div>
        <div><dt>Time on site</dt><dd>{durationText(draft.checkIn.time, draft.checkOut.time)}</dd></div>
        <div><dt>Attendance</dt><dd>GPS-verified</dd></div>
        {progress && <div><dt>Progress</dt><dd>{progress.emoji} {progress.text}</dd></div>}
        {quality && <div><dt>Quality</dt><dd>{quality.emoji} {quality.label}</dd></div>}
        <div><dt>Issues reported</dt><dd>{summary.issues} ({summary.critical} critical)</dd></div>
        <div><dt>Overall status</dt><dd><Badge tone={summary.overall.tone}>{summary.overall.emoji} {summary.overall.label}</Badge></dd></div>
      </dl>
      <div className="action-bar" style={{ justifyContent: 'center' }}>
        <button className="btn btn-ghost" onClick={() => leave(listPath(site))}>Back to {site.type === 'existing' ? 'old' : 'new'} sites</button>
        <button className="btn" onClick={() => leave('/inspector')}>Go to home</button>
      </div>
    </section>
  )
}
