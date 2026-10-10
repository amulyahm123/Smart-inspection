import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, HardHat, CalendarClock, UserRound, Search } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useInspection } from '../../context/InspectionContext'
import { getSites, getUserById } from '../../services/dataService'
import { progressStatus } from '../../utils/status'
import { formatDate } from '../../utils/date'
import { sitePath } from '../../utils/paths'
import PageHead from '../../components/ui/PageHead'
import Badge from '../../components/ui/Badge'

export default function NewSites() {
  const { user } = useAuth()
  const { draft } = useInspection()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [mine, setMine] = useState(false)

  const projects = getSites('construction').filter((p) =>
    (status === 'all' || progressStatus(p.expectedProgress, p.actualProgress).label === status) &&
    (!mine || p.assignedOfficer === user.id) &&
    `${p.name} ${p.area} ${p.contractor}`.toLowerCase().includes(q.toLowerCase()))

  return (
    <>
      <PageHead title="New sites – under construction" subtitle="Active projects with expected vs observed progress." />
      {draft && !draft.checkOut && (
        <div className="warn" style={{ marginBottom: 14 }}>
          An inspection is in progress. <Link to={`${sitePath({ type: draft.kind === 'existing' ? 'existing' : 'construction', id: draft.siteId })}/inspect`}><b>Resume it</b></Link>
        </div>
      )}
      <div className="filters">
        <input placeholder="Search project, area or contractor" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search projects" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by progress status">
          <option value="all">All progress</option>
          <option value="On Track">On Track</option>
          <option value="Attention Required">Attention Required</option>
          <option value="Delayed">Delayed</option>
        </select>
        <button className={`btn ${mine ? '' : 'btn-ghost'}`} onClick={() => setMine(!mine)}>Assigned to me</button>
      </div>

      {projects.length === 0 && <div className="card muted"><Search size={16} /> No projects match. Clear the filters to see all projects.</div>}
      <div className="grid grid-3">
        {projects.map((p) => {
          const st = progressStatus(p.expectedProgress, p.actualProgress)
          return (
            <Link to={`/inspector/new-sites/${p.id}`} className="card site-card site-link" key={p.id}>
              <div className="card-head"><span className="muted small">{p.id} · {p.phase}</span><Badge tone={st.tone}>{st.label}</Badge></div>
              <h3>{p.name}</h3>
              <ul className="meta-list">
                <li><MapPin size={14} /> {p.area}</li>
                <li><HardHat size={14} /> {p.contractor}</li>
                <li><CalendarClock size={14} /> Target {formatDate(p.targetDate)}</li>
                <li><UserRound size={14} /> {getUserById(p.assignedOfficer).name}{p.assignedOfficer === user.id ? ' (you)' : ''}</li>
              </ul>
              <div className="progress-line"><span>Expected {p.expectedProgress}%</span><span>Actual {p.actualProgress}% ({st.diff > 0 ? '+' : ''}{st.diff}%)</span></div>
              <div className="meter"><span className={`fill-${st.tone}`} style={{ width: `${p.actualProgress}%` }} /><i style={{ left: `${p.expectedProgress}%` }} /></div>
            </Link>
          )
        })}
      </div>
    </>
  )
}
