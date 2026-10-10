import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { getOfficerRows } from '../../services/adminService'
import PageHead from '../../components/ui/PageHead'

export default function Officers() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const rows = getOfficerRows().filter(({ user: u }) => `${u.name} ${u.officerId} ${u.department} ${u.area}`.toLowerCase().includes(q.toLowerCase()))

  return (
    <>
      <PageHead title="Officers" subtitle="Select an officer to open the full profile. Attendance = last 30 days from GPS check-in / check-out." />
      <div className="filters"><input placeholder="Search name, ID, department or area" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search officers" /></div>
      {rows.length === 0 && <div className="card muted"><Search size={16} /> No officers match.</div>}
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Officer ID</th><th>Phone</th><th>Department</th><th>Assigned area</th><th>Attendance</th><th>Completed</th><th>Pending</th><th>Missed</th></tr></thead>
          <tbody>
            {rows.map(({ user: u, completed, pending, missed, attendance }) => (
              <tr key={u.id} className="row-link" onClick={() => navigate(`/admin/officers/${u.id}`)}>
                <td><Link to={`/admin/officers/${u.id}`} onClick={(e) => e.stopPropagation()}><b>{u.name}</b></Link><div className="muted small">{u.designation}</div></td>
                <td>{u.officerId}</td><td>{u.phone}</td><td>{u.department}</td><td>{u.area}</td>
                <td>{attendance.percent === null ? '–' : <b className={attendance.percent >= 80 ? 'good' : attendance.percent >= 60 ? 'warn-text' : 'bad'}>{attendance.percent}%</b>}</td>
                <td>{completed}</td><td>{pending}</td><td>{missed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
