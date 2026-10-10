// One stacked bar per row. rows = [{ label, parts: [{ value, tone }] }], legend = [{ label, tone }]
export default function StackedBars({ rows, legend }) {
  const max = Math.max(...rows.map((r) => r.parts.reduce((s, p) => s + p.value, 0)), 1)
  return (
    <div>
      {rows.map((r) => {
        const total = r.parts.reduce((s, p) => s + p.value, 0)
        return (
          <div className="bar-row wide" key={r.label}>
            <span title={r.label}>{r.label}</span>
            <div className="bar stack">
              {r.parts.map((p, i) => p.value > 0 && <span key={i} className={`fill-${p.tone}`} style={{ width: `${(p.value / max) * 100}%` }} title={`${p.value}`} />)}
            </div>
            <b>{total}</b>
          </div>
        )
      })}
      <ul className="legend inline">
        {legend.map((l) => <li key={l.label}><span className={`swatch fill-${l.tone}`} /> {l.label}</li>)}
      </ul>
    </div>
  )
}
