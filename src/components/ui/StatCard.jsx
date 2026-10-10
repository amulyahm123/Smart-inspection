import { Link } from 'react-router-dom'

export default function StatCard({ icon: Icon, label, value, tone = 'blue', to }) {
  const card = (
    <div className="card stat">
      <div className={`s-icon tone-${tone}`}><Icon size={22} /></div>
      <div>
        <div className="s-value">{value}</div>
        <div className="s-label">{label}</div>
      </div>
    </div>
  )
  return to ? <Link to={to} className="stat-link">{card}</Link> : card
}
