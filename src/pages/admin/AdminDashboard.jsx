import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldAlert, FolderKanban, Users, ClipboardCheck, Clock, AlertTriangle, AlertOctagon, CheckCircle2, XCircle, ChevronRight } from 'lucide-react'
import { getAdminSummary, getIssues } from '../../services/dataService'
import { getRecentActivity } from '../../services/adminService'
import { timeAgo, todayLabel } from '../../utils/date'
import PageHead from '../../components/ui/PageHead'
import StatCard from '../../components/ui/StatCard'
import Toast from '../../components/ui/Toast'
import HighRiskSites from '../../components/risk/HighRiskSites'
import { useAuth } from '../../context/AuthContext'
import { getRiskSummary } from '../../services/riskService'

const sevOrder = [['Critical', 'red'], ['High', 'orange'], ['Medium', 'amber'], ['Low', 'blue']]

// Every number and the activity feed are calculated from the live data. Cards open the matching page.
export default function AdminDashboard() {
  const { user } = useAuth()
  const [toast, setToast] = useState(null)
  const risk = getRiskSummary()
  const a = getAdminSummary()
  const open = getIssues().filter((i) => !['Resolved', 'Closed'].includes(i.status))
  const maxSev = Math.max(...sevOrder.map(([s]) => open.filter((i) => i.severity === s).length), 1)
  const activity = getRecentActivity(8)

  return (
    <>
      <PageHead title="Monitoring dashboard" subtitle={`${todayLabel()} · All districts`} />

      <div className="grid grid-4">
        <StatCard to="/admin/sites" icon={FolderKanban} label="Total projects / sites" value={a.totalProjects} tone="blue" />
        <StatCard to="/admin/officers" icon={Users} label="Active officers" value={a.activeOfficers} tone="green" />
        <StatCard to="/admin/inspections" icon={ClipboardCheck} label="Inspections completed" value={a.completed} tone="green" />
        <StatCard to="/admin/inspections" icon={Clock} label="Pending inspections" value={a.pending} tone="amber" />
        <StatCard to="/admin/issues" icon={AlertTriangle} label="Open issues" value={a.openIssues} tone="orange" />
        <StatCard to="/admin/alerts" icon={AlertOctagon} label="Critical issues" value={a.criticalIssues} tone="red" />
        <StatCard to="/admin/issues" icon={CheckCircle2} label="Resolved issues" value={a.resolvedIssues} tone="green" />
        <StatCard to="/admin/inspections" icon={XCircle} label="Missed inspections" value={a.missed} tone="red" />
        <StatCard to="/admin/sites?risk=high" icon={ShieldAlert} label="High-risk sites" value={risk.high} tone="red" />
        <StatCard to="/admin/sites?risk=medium" icon={ShieldAlert} label="Medium-risk sites" value={risk.medium} tone="amber" />
        <StatCard to="/admin/sites?risk=low" icon={ShieldAlert} label="Low-risk sites" value={risk.low} tone="green" />
        <StatCard to="/admin/sites?sort=risk" icon={Clock} label="Need immediate inspection" value={risk.immediate} tone="orange" />
      </div>

      <HighRiskSites user={user} onMessage={(text, tone = 'ok') => setToast({ text, tone })} />

      <div className="grid grid-2 section">
        <section className="card">
          <div className="card-head"><h2>Recent activity</h2><Link to="/admin/notifications" className="muted small">Notifications <ChevronRight size={12} style={{ verticalAlign: 'middle' }} /></Link></div>
          {activity.length === 0 && <p className="muted">No activity yet.</p>}
          {activity.map((x) => (
            <Link to={x.link} className="list-row" key={x.id}>
              <div className="grow">{x.text}</div>
              <span className="muted small" style={{ whiteSpace: 'nowrap' }}>{timeAgo(Math.max(0, Math.round((Date.now() - x.at) / 60000)))}</span>
            </Link>
          ))}
        </section>

        <section className="card">
          <div className="card-head"><h2>Open issues by severity</h2><Link to="/admin/alerts" className="muted small">All alerts <ChevronRight size={12} style={{ verticalAlign: 'middle' }} /></Link></div>
          {sevOrder.map(([sev, tone]) => {
            const n = open.filter((i) => i.severity === sev).length
            return (
              <div className="bar-row" key={sev}>
                <span>{sev}</span>
                <div className="bar"><span className={`fill-${tone}`} style={{ width: `${(n / maxSev) * 100}%` }} /></div>
                <b>{n}</b>
              </div>
            )
          })}
        </section>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  )
}
