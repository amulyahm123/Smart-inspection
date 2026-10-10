import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import Badge from '../ui/Badge'
import { severityTone } from '../../utils/status'

// One checklist/material row: label + 3 buttons. Flagged answers get a "Report issue" button.
export default function CheckRow({ item, options, value, issue, onChange, onReport }) {
  const flagged = options.some((o) => o.value === value && o.flag)
  return (
    <div className="check-item">
      <b>{item.label}</b>
      <div className="seg">
        {options.map((o) => (
          <button key={o.value} className={value === o.value ? `on-${o.cls}` : ''} aria-pressed={value === o.value} onClick={() => onChange(o.value)}>{o.label}</button>
        ))}
      </div>
      {flagged && (
        <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {issue ? (
            <>
              <Badge tone="green"><CheckCircle2 size={12} /> Issue saved</Badge>
              <Badge tone={severityTone[issue.severity]}>{issue.severity}</Badge>
              {issue.recurring && <Badge tone="orange">Recurring issue</Badge>}
            </>
          ) : (
            <button className="btn btn-ghost" style={{ padding: '6px 12px' }} onClick={onReport}><AlertTriangle size={15} /> Report issue</button>
          )}
        </div>
      )}
    </div>
  )
}
