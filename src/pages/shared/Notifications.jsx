import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, CheckCheck, BellOff } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getNotifications, markRead, markAllRead } from '../../services/notificationService'
import { NOTE_META } from '../../components/notifications/notificationMeta'
import { relTime } from '../../utils/date'
import PageHead from '../../components/ui/PageHead'
import Badge from '../../components/ui/Badge'

// Click a notification to open what it is about (inspection, issue, project, alert or camera).
export default function Notifications() {
  const { user } = useAuth()
  const [, setVersion] = useState(0)
  const refresh = () => setVersion((v) => v + 1)
  const [filter, setFilter] = useState('all')
  const all = getNotifications(user)
  const unread = all.filter((n) => !n.read).length
  const team = all.filter((n) => n.audience === 'team')
  const shown = filter === 'unread' ? all.filter((n) => !n.read) : filter === 'team' ? team : all
  const chips = [['all', `All (${all.length})`], ['unread', `Unread (${unread})`], ...(user.role === 'admin' ? [['team', `Team notices (${team.length})`]] : [])]

  return (
    <>
      <PageHead title="Notifications" subtitle={`${unread} unread · tap one to open it`}>
        <button className="btn btn-ghost" disabled={unread === 0} onClick={() => { markAllRead(user); refresh() }}><CheckCheck size={16} /> Mark all as read</button>
      </PageHead>

      <div className="cat-tabs" role="tablist" aria-label="Notification filter">
        {chips.map(([k, l]) => <button key={k} role="tab" aria-selected={filter === k} className={`cat-tab ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>{l}</button>)}
      </div>

      {shown.length === 0 && <div className="card muted" style={{ textAlign: 'center', padding: 28 }}><BellOff size={24} /><p style={{ marginTop: 6 }}>{filter === 'unread' ? 'You are all caught up.' : 'No notifications yet.'}</p></div>}
      <div className="note-list">
        {shown.map((n) => {
          const meta = NOTE_META[n.kind] || NOTE_META.info
          const Icon = meta.icon
          const inner = (
            <>
              <span className={`alert-ico tone-${meta.tone}`}><Icon size={20} /></span>
              <span className="alert-main">
                <span className="alert-title">{n.title}</span>
                <span className="alert-sub">{n.body}</span>
                <span className="alert-time">{relTime(n.at)}{n.audience === 'team' && <> · <Badge tone="gray">Sent to {n.team}</Badge></>}</span>
              </span>
              {!n.read && <span className="unread" aria-label="Unread" />}
              {n.link && <ChevronRight size={18} className="muted" />}
            </>
          )
          return n.link
            ? <Link key={n.id} to={n.link} className={`note-row ${n.read ? '' : 'is-unread'}`} onClick={() => markRead(n.id)}>{inner}</Link>
            : <div key={n.id} className={`note-row ${n.read ? '' : 'is-unread'}`}>{inner}</div>
        })}
      </div>
    </>
  )
}
