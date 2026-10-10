// Horizontal bars. rows = [{ label, value, tone }]  (tone: red | orange | amber | blue | green | gray)
export default function BarList({ rows, suffix = '' }) {
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <div>
      {rows.map((r) => (
        <div className="bar-row wide" key={r.label}>
          <span title={r.label}>{r.label}</span>
          <div className="bar"><span className={`fill-${r.tone || 'blue'}`} style={{ width: `${(r.value / max) * 100}%` }} /></div>
          <b>{r.value}{suffix}</b>
        </div>
      ))}
    </div>
  )
}
