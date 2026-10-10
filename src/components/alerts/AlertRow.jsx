import { Repeat2, TrendingUp } from 'lucide-react'
import Badge from '../ui/Badge'
import { ALERT_META, STATUS_TONE } from './alertMeta'
import { severityTone } from '../../utils/status'
import { formatDateTime, formatDate, relTime } from '../../utils/date'

// One scannable alert: colour bar = severity, icon = type, badges on the right.
export default function AlertRow({ alert: a, onOpen }) {
  const meta = ALERT_META[a.kind]
  const Icon = meta.icon
  const iso = new Date(a.at).toISOString()
  return (
    <button className={`alert-row sev-${a.severity.toLowerCase()} ${a.status === 'Resolved' || a.status === 'Closed' ? 'is-done' : ''}`} onClick={() => onOpen(a.id)}>
      <span className={`alert-ico tone-${meta.tone}`}><Icon size={20} /></span>
      <span className="alert-main">
        <span className="alert-title">{a.title}</span>
        <span className="alert-sub">{a.typeLabel} · {a.siteName} · {a.inspectorName}</span>
        <span className="alert-time">{a.dateOnly ? formatDate(iso.slice(0, 10)) : formatDateTime(iso)} · {relTime(a.at)}</span>
        {(a.recurring || a.escalated) && (
          <span className="pill-row" style={{ marginTop: 4 }}>
            {a.recurring && <Badge tone="orange"><Repeat2 size={12} /> Recurring Issue ×{a.recurrenceCount}</Badge>}
            {a.escalated && <Badge tone="red"><TrendingUp size={12} /> {a.escalationLevel}</Badge>}
          </span>
        )}
      </span>
      <span className="alert-side">
        <Badge tone={severityTone[a.severity]}>{a.severity}</Badge>
        <Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge>
      </span>
    </button>
  )
}
