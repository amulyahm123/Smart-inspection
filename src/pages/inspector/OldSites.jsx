import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Building, CalendarClock, UserRound, Search } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useInspection } from '../../context/InspectionContext'
import { getSites, getUserById, siteAge, getIssuesForSite } from '../../services/dataService'
import { siteTone, siteLabel } from '../../utils/status'
import { formatDate } from '../../utils/date'
import PageHead from '../../components/ui/PageHead'
import Badge from '../../components/ui/Badge'

export default function OldSites() {
  const { user } = useAuth()
  const { draft } = useInspection()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [mine, setMine] = useState(false)

  const sites = getSites('existing').filter((s) =>
    (status === 'all' || s.status === status) &&
    (!mine || s.assignedOfficer === user.id) &&
    `${s.name} ${s.area} ${s.department}`.toLowerCase().includes(q.toLowerCase()))

  return (
    <>
      <PageHead title="Old sites – existing" subtitle="Completed and operational sites. Open a site to start an inspection." />
      {draft && !draft.checkOut && (
        <div className="warn" style={{ marginBottom: 14 }}>
          An inspection is in progress. <Link to={`/inspector/old-sites/${draft.siteId}/inspect`}><b>Resume it</b></Link>
        </div>
      )}
      <div className="filters">
        <input placeholder="Search site, area or department" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search sites" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="good">Good</option>
          <option value="attention">Attention required</option>
          <option value="critical">Critical</option>
        </select>
        <button className={`btn ${mine ? '' : 'btn-ghost'}`} onClick={() => setMine(!mine)}>Assigned to me</button>
      </div>

      {sites.length === 0 && <div className="card muted"><Search size={16} /> No sites match. Clear the filters to see all sites.</div>}
      <div className="grid grid-3">
        {sites.map((s) => {
          const open = getIssuesForSite(s.id).filter((i) => !['Resolved', 'Closed'].includes(i.status)).length
          return (
            <Link to={`/inspector/old-sites/${s.id}`} className="card site-card site-link" key={s.id}>
              <div className="card-head"><span className="muted small">{s.id}</span><Badge tone={siteTone[s.status]}>{siteLabel[s.status]}</Badge></div>
              <h3>{s.name}</h3>
              <ul className="meta-list">
                <li><MapPin size={14} /> {s.area}</li>
                <li><Building size={14} /> {s.department}{siteAge(s) !== null && ` · ${siteAge(s)} yrs old`}</li>
                <li><CalendarClock size={14} /> Last inspected {formatDate(s.lastInspected)}</li>
                <li><UserRound size={14} /> {getUserById(s.assignedOfficer).name}{s.assignedOfficer === user.id ? ' (you)' : ''}</li>
              </ul>
              <div className="pill-row"><Badge tone={open ? 'orange' : 'gray'}>{open} open issue{open === 1 ? '' : 's'}</Badge></div>
            </Link>
          )
        })}
      </div>
    </>
  )
}
