import { useState } from 'react'
import { Link } from 'react-router-dom'
import { UserCheck, UserX, Timer, MapPin, Search } from 'lucide-react'
import { getInspectors } from '../../services/dataService'
import { getAttendanceRecords, summariseAttendance } from '../../services/adminService'
import { attendanceTone } from '../../utils/status'
import { formatDate, formatTime, formatMinutes } from '../../utils/date'
import PageHead from '../../components/ui/PageHead'
import StatCard from '../../components/ui/StatCard'
import Badge from '../../components/ui/Badge'

// Attendance is NOT typed in by anyone: it is calculated from GPS-verified check-in / check-out on inspections.
export default function Attendance() {
  const [days, setDays] = useState(30)
  const [officer, setOfficer] = useState('all')
  const [status, setStatus] = useState('all')
  const records = getAttendanceRecords({ days, officerId: officer })
  const rows = records.filter((r) => status === 'all' || r.status === status)
  const sum = summariseAttendance(records)
  const perOfficer = getInspectors().map((u) => ({ u, ...summariseAttendance(getAttendanceRecords({ days, officerId: u.id })) }))

  return (
    <>
      <PageHead title="Attendance" subtitle="Calculated from GPS check-in / check-out on inspection records. No manual entry." />

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <StatCard icon={UserCheck} label="Attendance rate" value={sum.percent === null ? '–' : `${sum.percent}%`} tone="blue" />
        <StatCard icon={UserCheck} label="Present days" value={sum.present} tone="green" />
        <StatCard icon={UserX} label="Absent / incomplete" value={`${sum.absent} / ${sum.incomplete}`} tone="red" />
        <StatCard icon={Timer} label="Hours on site" value={(sum.minutes / 60).toFixed(1)} tone="gray" />
      </div>

      <section className="card" style={{ marginBottom: 16 }}>
        <div className="card-head"><h2>By officer (last {days} days)</h2></div>
        {perOfficer.map(({ u, percent, present, scheduledDays }) => (
          <div className="bar-row wide" key={u.id}>
            <Link to={`/admin/officers/${u.id}`}>{u.name}</Link>
            <div className="bar"><span className={`fill-${percent === null ? 'gray' : percent >= 80 ? 'green' : percent >= 60 ? 'amber' : 'red'}`} style={{ width: `${percent || 0}%` }} /></div>
            <b title={`${present} of ${scheduledDays} days`}>{percent === null ? '–' : `${percent}%`}</b>
          </div>
        ))}
        <p className="muted small" style={{ marginTop: 8 }}>Present = a day with at least one inspection that has a GPS check-in and check-out. Absent = inspections were scheduled but no GPS check-in was recorded. Incomplete = checked in, no check-out.</p>
      </section>

      <div className="filters">
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Period">
          <option value={7}>Last 7 days</option><option value={14}>Last 14 days</option><option value={30}>Last 30 days</option>
        </select>
        <select value={officer} onChange={(e) => setOfficer(e.target.value)} aria-label="Filter by officer">
          <option value="all">All officers</option>{getInspectors().map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by attendance status">
          <option value="all">All statuses</option><option>Present</option><option>Incomplete</option><option>Absent</option>
        </select>
      </div>

      {rows.length === 0 && <div className="card muted"><Search size={16} /> No attendance records for this selection.</div>}
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Officer</th><th>Site(s)</th><th>GPS check-in</th><th>GPS check-out</th><th>Time on site</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{formatDate(r.date)}</td>
                <td><Link to={`/admin/officers/${r.officerId}`}><b>{r.officer.name}</b></Link></td>
                <td>{r.sites.join(', ')}</td>
                <td>{r.firstIn ? <>{formatTime(r.firstIn)} <span className="muted small"><MapPin size={11} /> {r.verified ? `verified · ${r.distance} m` : 'unverified'}</span></> : '–'}</td>
                <td>{r.lastOut ? formatTime(r.lastOut) : '–'}</td>
                <td>{formatMinutes(r.minutes)}</td>
                <td><Badge tone={attendanceTone[r.status]}>{r.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
