import Badge from '../ui/Badge'
import { RISK_TONE, RISK_COLOR, RISK_LABEL, CONF_TONE, CONF_LABEL } from '../../utils/risk'

// "78 · High Risk" pill
export function RiskBadge({ risk }) {
  if (!risk) return <Badge tone="gray">Not scored</Badge>
  return <Badge tone={RISK_TONE[risk.level]}>{risk.score} · {RISK_LABEL[risk.level]} Risk</Badge>
}

// Thin bar + number for tables. A "*" marks a score based on limited data.
export function RiskBar({ risk }) {
  if (!risk) return <span className="muted small">Not scored</span>
  return (
    <div className="risk-bar" title={`${risk.levelLabel} – score ${risk.score}/100 – data confidence ${CONF_LABEL[risk.confidence]}`}>
      <div className="risk-bar-track" role="img" aria-label={`Risk score ${risk.score} out of 100, ${risk.levelLabel}`}>
        <span style={{ width: `${Math.max(3, risk.score)}%`, background: RISK_COLOR[risk.level] }} />
      </div>
      <b style={{ color: RISK_COLOR[risk.level] }}>{risk.score}</b>
      {risk.confidence === 'low' && <span className="muted small" title="Limited data – treat this score with care">*</span>}
    </div>
  )
}

export function ConfidenceBadge({ confidence }) {
  return <Badge tone={CONF_TONE[confidence]}>Data confidence: {CONF_LABEL[confidence]}</Badge>
}

// Circular indicator
export function RiskGauge({ risk, size = 132 }) {
  const R = 46
  const C = 2 * Math.PI * R
  const len = (Math.max(0, Math.min(100, risk.score)) / 100) * C
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={`Risk score ${risk.score} out of 100, ${risk.levelLabel}`}>
      <circle cx="60" cy="60" r={R} fill="none" strokeWidth="11" style={{ stroke: 'var(--gray-bg)' }} />
      <circle cx="60" cy="60" r={R} fill="none" strokeWidth="11" strokeLinecap="round" style={{ stroke: RISK_COLOR[risk.level] }}
        strokeDasharray={`${len} ${C - len}`} transform="rotate(-90 60 60)" />
      <text x="60" y="62" textAnchor="middle" fontSize="30" fontWeight="700" style={{ fill: 'var(--ink)' }}>{risk.score}</text>
      <text x="60" y="79" textAnchor="middle" fontSize="9" style={{ fill: 'var(--muted)' }}>out of 100</text>
    </svg>
  )
}
