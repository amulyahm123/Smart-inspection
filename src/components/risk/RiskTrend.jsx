import { RISK_COLOR } from '../../utils/risk'
import { REASON_LABEL } from '../../services/riskService'
import { formatDateTime } from '../../utils/date'

// Line chart of the recorded score snapshots, with the Low / Medium / High bands behind it.
export default function RiskTrend({ history, limits }) {
  const W = 600, H = 190, L = 34, R = 12, T = 10, B = 26
  const pts = history.map((h, i) => ({ ...h, x: history.length === 1 ? (L + W - R) / 2 : L + (i / (history.length - 1)) * (W - L - R), y: T + (1 - h.score / 100) * (H - T - B) }))
  const y = (v) => T + (1 - v / 100) * (H - T - B)
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="risk-trend" role="img" aria-label={`Risk score history: ${history.map((h) => `${h.date} ${h.score}`).join(', ')}`}>
      <rect x={L} y={y(limits.lowMax)} width={W - L - R} height={y(0) - y(limits.lowMax)} style={{ fill: 'var(--green-bg)' }} />
      <rect x={L} y={y(limits.mediumMax)} width={W - L - R} height={y(limits.lowMax) - y(limits.mediumMax)} style={{ fill: 'var(--amber-bg)' }} />
      <rect x={L} y={y(100)} width={W - L - R} height={y(limits.mediumMax) - y(100)} style={{ fill: 'var(--red-bg)' }} />
      {[0, limits.lowMax, limits.mediumMax, 100].map((v) => (
        <g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} style={{ stroke: 'var(--line)' }} /><text x={L - 5} y={y(v) + 3} textAnchor="end" fontSize="9" style={{ fill: 'var(--muted)' }}>{v}</text></g>
      ))}
      {pts.length > 1 && <path d={path} fill="none" strokeWidth="2.2" style={{ stroke: 'var(--brand)' }} />}
      {pts.map((p) => (
        <circle key={p.id} cx={p.x} cy={p.y} r="4.5" strokeWidth="2" style={{ fill: RISK_COLOR[p.level], stroke: '#fff' }}>
          <title>{`${formatDateTime(p.at)} – score ${p.score} – ${REASON_LABEL[p.reason] || ''}`}</title>
        </circle>
      ))}
      {pts.length > 0 && <text x={pts[0].x} y={H - 8} textAnchor={pts.length === 1 ? 'middle' : 'start'} fontSize="9" style={{ fill: 'var(--muted)' }}>{pts[0].date}</text>}
      {pts.length > 1 && <text x={pts[pts.length - 1].x} y={H - 8} textAnchor="end" fontSize="9" style={{ fill: 'var(--muted)' }}>{pts[pts.length - 1].date}</text>}
    </svg>
  )
}
