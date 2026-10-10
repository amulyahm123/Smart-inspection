import { Check } from 'lucide-react'
import { ISSUE_FLOW } from '../../services/dataService'

// Reported → Verified → Assigned → In Progress → Resolved → Closed
export default function LifecycleStepper({ status }) {
  const idx = ISSUE_FLOW.indexOf(status)
  return (
    <ol className="lifecycle" aria-label="Issue lifecycle">
      {ISSUE_FLOW.map((s, i) => (
        <li key={s} className={i < idx ? 'done' : i === idx ? 'now' : ''} aria-current={i === idx ? 'step' : undefined}>
          <span className="n">{i < idx ? <Check size={12} /> : i + 1}</span>{s}
        </li>
      ))}
    </ol>
  )
}
