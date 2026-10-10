import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarCheck, CheckCircle2, Clock, XCircle, AlertTriangle } from 'lucide-react'
import { getUserById, getSites, getSiteById } from '../../services/dataService'
import { getOfficerStats, getInspectionsForOfficer, getAttendanceRecords, getOpenIssueCount } from '../../services/adminService'
import { severityTone, issueTone, bucketTone, bucketLabel, attendanceTone, siteTone, siteLabel } from '../../utils/status'
import { formatDate, formatTime, formatMinutes } from '../../utils/date'
import PageHead from '../../components/ui/PageHead'
import StatCard from '../../components/ui/StatCard'
import Badge from '../../components/ui/Badge'

export default function OfficerDetail() {
  const { officerId } = useParams()
  const user = getUserById(officerId)
  if (!user || user.role !== 'inspector') return <Navigate to="/admin/officers" replace />

  const stats = getOfficerStats(officerId)
  const inspections = getInspectionsForOfficer(officerId)
  const history = inspections.filter((i) => i.bucket === 'completed' || i.bucket === 'missed')
  const current = inspections.filter((i) => i.bucket === 'pending' || i.bucket === 'upcoming').reverse()
  const assigned = getSites().filter((s) => s.assignedOfficer === officerId)
  const attendance = getAttendanceRecords({ officerId }).slice(0, 10)

  // sites this officer actually inspected (completed), with visit counts
  const visited = Object.values(history.filter((i) => i.bucket === 'completed').reduce((m, i) => {
    m[i.siteId] = m[i.siteId] || { site: i.site, count: 0, last: i.date }
    m[i.siteId].count += 1
    if (i.date > m[i.siteId].last) m[i.siteId].last = i.date
    return m
  }, {}))

  return (
    <>
      <Link to="/admin/officers" className="back-link"><ArrowLeft size={16} /> All officers</Link>
      <section className="card profile-head">
        <div className="avatar" aria-hidden="true">{user.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</div>
        <div>
          <h1>{user.name}</h1>
          <p className="muted">{user.designation} · {user.department}</p>
          <p className="small">{user.officerId} · {user.phone} · Area: {user.area}</p>
        </div>
      </section>

      <div className="grid grid-4 section">
        <StatCard icon={CalendarCheck} label="Attendance (30 days)" value={stats.attendance.percent === null ? '–' : `${stats.attendance.percent}%`} tone="blue" />
        <StatCard icon={CheckCircle2} label="Completed inspections" value={stats.completed} tone="green" />
        <StatCard icon={Clock} label="Pending / upcoming" value={`${stats.pending} / ${stats.upcoming}`} tone="amber" />
        <StatCard icon={XCircle} label="Missed inspections" value={stats.missed} tone="red" />
      </div>

      <div className="grid grid-2 section">
        <section className="card">
          <div className="card-head"><h2>Current assignments</h2></div>
          <b className="small muted">Assigned sites / projects</b>
          {assigned.map((s) => (
            <div className="list-row" key={s.id}>
              <div className="grow"><Link to={`/admin/sites/${s.id}`}><b>{s.name}</b></Link><div className="muted small">{s.type === 'existing' ? 'Existing' : `Construction · ${s.phase}`} · {getOpenIssueCount(s.id)} open issues</div></div>
              <Badge tone={siteTone[s.status]}>{siteLabel[s.status]}</Badge>
            </div>
          ))}
          <b className="small muted" style={{ display: 'block', marginTop: 14 }}>Scheduled inspections</b>
          {current.length === 0 && <p className="muted small">Nothing scheduled.</p>}
          {current.map((i) => (
            <div className="list-row" key={i.id}>
              <div className="grow"><b>{i.site.name}</b><div className="muted small">{formatDate(i.date)} · {i.slot}</div></div>
              <Badge tone={bucketTone[i.bucket]}>{bucketLabel[i.bucket]}</Badge>
            </div>
          ))}
        </section>

        <section className="card">
          <div className="card-head"><h2>Sites inspected</h2></div>
          {visited.length === 0 && <p className="muted">No completed inspections yet.</p>}
          {visited.map((v) => (
            <div className="list-row" key={v.site.id}>
              <div className="grow"><Link to={`/admin/sites/${v.site.id}`}><b>{v.site.name}</b></Link><div className="muted small">Last visit {formatDate(v.last)}</div></div>
              <Badge tone="blue">{v.count} visit{v.count === 1 ? '' : 's'}</Badge>
            </div>
          ))}
        </section>
      </div>

      <section className="card section table-wrap">
        <h2 style={{ marginBottom: 8 }}>Previous inspections</h2>
        <table>
          <thead><tr><th>Date</th><th>Site / project</th><th>Slot</th><th>Check-in</th><th>Check-out</th><th>On site</th><th>Status</th></tr></thead>
          <tbody>
            {history.map((i) => (
              <tr key={i.id}>
                <td>{formatDate(i.date)}</td><td><Link to={`/admin/sites/${i.siteId}`}>{i.site.name}</Link></td><td>{i.slot}</td>
                <td>{i.checkIn ? formatTime(i.checkIn.time) : '–'}</td><td>{i.checkOut ? formatTime(i.checkOut.time) : '–'}</td><td>{formatMinutes(i.durationMin)}</td>
                <td><Badge tone={bucketTone[i.bucket]}>{bucketLabel[i.bucket]}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="grid grid-2 section">
        <section className="card">
          <div className="card-head"><h2>Issues reported ({stats.issues.length})</h2></div>
          {stats.issues.length === 0 && <p className="muted">No issues reported.</p>}
          {stats.issues.map((i) => (
            <div className="list-row" key={i.id}>
              <div className="grow"><b>{i.title}</b><div className="muted small">{i.id} · {getSiteById(i.siteId).name}</div></div>
              <div className="pill-row"><Badge tone={severityTone[i.severity]}>{i.severity}</Badge><Badge tone={issueTone[i.status]}>{i.status}</Badge></div>
            </div>
          ))}
        </section>

        <section className="card">
          <div className="card-head"><h2>Attendance history</h2></div>
          {attendance.length === 0 && <p className="muted">No records yet.</p>}
          {attendance.map((r) => (
            <div className="list-row" key={r.id}>
              <div className="grow"><b>{formatDate(r.date)}</b>
                <div className="muted small">{r.firstIn ? `In ${formatTime(r.firstIn)}` : 'No check-in'}{r.lastOut ? ` · Out ${formatTime(r.lastOut)}` : ''}{r.minutes ? ` · ${formatMinutes(r.minutes)}` : ''}</div></div>
              <Badge tone={attendanceTone[r.status]}>{r.status}</Badge>
            </div>
          ))}
        </section>
      </div>
    </>
  )
}
