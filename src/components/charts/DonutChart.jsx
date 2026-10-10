// Simple SVG donut. data = [{ label, value, color }]
export default function DonutChart({ data, centerValue, centerLabel }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const R = 42
  const C = 2 * Math.PI * R
  let used = 0
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 120 120" className="donut" role="img" aria-label={data.map((d) => `${d.label} ${d.value}`).join(', ')}>
        <circle cx="60" cy="60" r={R} fill="none" strokeWidth="16" style={{ stroke: 'var(--gray-bg)' }} />
        {total > 0 && data.map((d) => {
          const len = (d.value / total) * C
          const el = <circle key={d.label} cx="60" cy="60" r={R} fill="none" strokeWidth="16" style={{ stroke: d.color }}
            strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-used} transform="rotate(-90 60 60)" />
          used += len
          return el
        })}
        <text x="60" y="58" textAnchor="middle" fontSize="20" fontWeight="700" style={{ fill: 'var(--ink)' }}>{centerValue}</text>
        <text x="60" y="73" textAnchor="middle" fontSize="8" style={{ fill: 'var(--muted)' }}>{centerLabel}</text>
      </svg>
      <ul className="legend">
        {data.map((d) => <li key={d.label}><span className="swatch" style={{ background: d.color }} /> {d.label}<b>{d.value}</b></li>)}
      </ul>
    </div>
  )
}
