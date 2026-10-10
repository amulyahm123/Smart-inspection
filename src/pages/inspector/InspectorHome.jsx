import { Link } from 'react-router-dom'
import { Building2, HardHat, Video, BellRing, CalendarCheck, Clock, AlertOctagon, Bell, ChevronRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  getInspectorSummary, getSites, getSiteById, getCameraStats,
} from '../../services/dataService'
import { getActiveAlerts } from '../../services/alertService'
import { getNotifications, markRead } from '../../services/notificationService'
import { progressStatus, inspectionTone } from '../../utils/status'
import { relTime, todayLabel } from '../../utils/date'
import { sitePath } from '../../utils/paths'
import PageHead from '../../components/ui/PageHead'
import StatCard from '../../components/ui/StatCard'
import Badge from '../../components/ui/Badge'

export default function InspectorHome() {
  const { user } = useAuth()
  const s = getInspectorSummary(user.id)
  const oldSites = getSites('existing')
  const newSites = getSites('construction')
  const delayed = newSites.filter((p) => progressStatus(p.expectedProgress, p.actualProgress).label === 'Delayed').length
  const cam = getCameraStats()
  const openAlerts = getActiveAlerts(user)
  const criticalAlerts = openAlerts.filter((a) => a.severity === 'Critical').length
  const notes = getNotifications(user)
  const unread = notes.filter((n) => !n.read).length

  return (
    <>
      <PageHead title={`Good day, ${user.name.split(' ')[0]}`} subtitle={`${todayLabel()} · ${user.designation}, ${user.area}`} />

      <div className="grid grid-4">
        <Link to="/inspector/old-sites" className="module m-old">
          <div className="m-icon"><Building2 size={22} /></div>
          <div className="m-title">Old Sites – Existing</div>
          <div className="m-value">{oldSites.length}</div>
          <div className="m-hint">{oldSites.filter((x) => x.status !== 'good').length} need attention</div>
        </Link>
        <Link to="/inspector/new-sites" className="module m-new">
          <div className="m-icon"><HardHat size={22} /></div>
          <div className="m-title">New Sites – Under Construction</div>
          <div className="m-value">{newSites.length}</div>
          <div className="m-hint">{delayed} behind schedule</div>
        </Link>
        <Link to="/inspector/cctv" className="module m-cctv">
          <div className="m-icon"><Video size={22} /></div>
          <div className="m-title">CCTV Feed – Active</div>
          <div className="m-value">{cam.live}/{cam.total}</div>
          <div className="m-hint">live · {cam.alerts} alert{cam.alerts === 1 ? '' : 's'} detected</div>
        </Link>
        <Link to="/inspector/alerts" className="module m-alert">
          <div className="m-icon"><BellRing size={22} /></div>
          <div className="m-title">Ongoing / Pending Alerts</div>
          <div className="m-value">{openAlerts.length}</div>
          <div className="m-hint">{criticalAlerts} critical</div>
        </Link>
      </div>

      <div className="grid grid-4 section">
        <StatCard icon={CalendarCheck} label="Today's inspections" value={s.today.length} tone="blue" />
        <StatCard icon={Clock} label="Pending inspections" value={s.pending.length} tone="amber" />
        <StatCard to="/inspector/alerts" icon={AlertOctagon} label="Critical issues" value={s.criticalIssues.length} tone="red" />
        <StatCard to="/inspector/notifications" icon={Bell} label="New notifications" value={unread} tone="orange" />
      </div>

      <div className="grid grid-2 section">
        <section className="card">
          <div className="card-head"><h2>Today's schedule</h2><span className="muted small">{s.assigned} assigned in total · {s.completed.length} completed</span></div>
          {s.today.length === 0 && <p className="muted">No inspections scheduled for today.</p>}
          {s.today.map((i) => {
            const site = getSiteById(i.siteId)
            const Row = Link
            return (
              <Row className="list-row" key={i.id} to={sitePath(site)}>
                <div className="slot">{i.slot}</div>
                <div className="grow">
                  <b>{site.name}</b>
                  <div className="muted small">{site.area} · {site.type === 'existing' ? 'Existing site' : `Construction – ${site.phase}`}</div>
                </div>
                <Badge tone={inspectionTone[i.status]}>{i.status.replace('-', ' ')}</Badge>
              </Row>
            )
          })}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Notifications</h2>
            <Link to="/inspector/notifications" className="muted small">View all <ChevronRight size={12} style={{ verticalAlign: 'middle' }} /></Link>
          </div>
          {notes.length === 0 && <p className="muted">No notifications.</p>}
          {notes.slice(0, 4).map((n) => {
            const Row = n.link ? Link : 'div'
            return (
              <Row className="list-row" key={n.id} {...(n.link ? { to: n.link, onClick: () => markRead(n.id) } : {})}>
                {!n.read ? <span className="unread" /> : <span style={{ width: 8 }} />}
                <div className="grow">
                  <b>{n.title}</b>
                  <div className="muted small">{n.body}</div>
                  <div className="muted small">{relTime(n.at)}</div>
                </div>
              </Row>
            )
          })}
        </section>
      </div>
    </>
  )
}
