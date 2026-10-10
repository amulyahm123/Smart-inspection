import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, CalendarCheck, Clock, CheckCircle2, XCircle, Shuffle } from 'lucide-react'
import { getInspectionRows } from '../../services/adminService'
import { getInspectors } from '../../services/dataService'
import { bucketTone, bucketLabel } from '../../utils/status'
import { formatDate, formatTime } from '../../utils/date'
import PageHead from '../../components/ui/PageHead'
import StatCard from '../../components/ui/StatCard'
import Badge from '../../components/ui/Badge'

const TABS = [['all', 'All'], ['upcoming', 'Upcoming'], ['pending', 'Pending'], ['completed', 'Completed'], ['missed', 'Missed']]

export default function Inspections() {
  const [tab, setTab] = useState('all')
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const [officer, setOfficer] = useState('all')
  const all = getInspectionRows()
  const n = (b) => all.filter((i) => i.bucket === b).length
  const base = all.filter((i) => (officer === 'all' || i.inspectorId === officer) && `${i.site.name} ${i.inspector.name} ${i.id}`.toLowerCase().includes(q.toLowerCase()))
  const rows = tab === 'all' ? base : base.filter((i) => i.bucket === tab)
  // upcoming first (soonest), then everything else newest first
  if (tab === 'upcoming') rows.sort((a, b) => a.date.localeCompare(b.date))

  return (
    <>
      <PageHead title="Inspections" subtitle="Upcoming, pending, completed and missed. Pending = due today, overdue or in progress." />
      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <StatCard icon={CalendarCheck} label="Upcoming" value={n('upcoming')} tone="blue" />
        <StatCard icon={Clock} label="Pending" value={n('pending')} tone="amber" />
        <StatCard icon={CheckCircle2} label="Completed" value={n('completed')} tone="green" />
        <StatCard icon={XCircle} label="Missed" value={n('missed')} tone="red" />
      </div>

      <Link to="/admin/assignments" className="card assign-banner"><Shuffle size={18} /> <span><b>Random inspection assignment</b><br /><span className="muted small">Generate surprise inspections and see the assignment history</span></span></Link>

      <div className="cat-tabs" role="tablist">
        {TABS.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={`cat-tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{l} ({k === 'all' ? base.length : base.filter((i) => i.bucket === k).length})</button>
        ))}
      </div>
      <div className="filters">
        <input placeholder="Search site, inspector or ID" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search inspections" />
        <select value={officer} onChange={(e) => setOfficer(e.target.value)} aria-label="Filter by inspector">
          <option value="all">All inspectors</option>{getInspectors().map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>

      {rows.length === 0 && <div className="card muted"><Search size={16} /> No inspections match.</div>}
      <div className="card table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Site / project</th><th>Inspector</th><th>Date</th><th>Time slot</th><th>GPS check-in / out</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id}>
                <td>{i.id}</td>
                <td><Link to={`/admin/sites/${i.siteId}`}><b>{i.site.name}</b></Link></td>
                <td><Link to={`/admin/officers/${i.inspectorId}`}>{i.inspector.name}</Link>{i.random && <> <Badge tone="gray">Random</Badge></>}</td>
                <td>{formatDate(i.date)}</td><td>{i.slot}</td>
                <td>{i.checkIn ? `${formatTime(i.checkIn.time)} → ${i.checkOut ? formatTime(i.checkOut.time) : 'on site'}` : '–'}</td>
                <td><Badge tone={bucketTone[i.bucket]}>{bucketLabel[i.bucket]}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
