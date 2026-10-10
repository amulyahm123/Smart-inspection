import { useState } from 'react'
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom'
import { LogOut, MoreHorizontal, ShieldCheck, Bell, RotateCcw } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useInspection } from '../../context/InspectionContext'
import { resetDemoData } from '../../services/dataService'
import { unreadCount } from '../../services/notificationService'
import { getActiveAlerts } from '../../services/alertService'
import { navByRole, bottomCount } from './navConfig'

export default function AppShell() {
  const { user, logout } = useAuth()
  const { clear } = useInspection()
  const navigate = useNavigate()
  const [moreOpen, setMoreOpen] = useState(false)

  const items = navByRole[user.role]
  const bottomItems = items.slice(0, bottomCount)
  const moreItems = items.slice(bottomCount)
  const unread = unreadCount(user)
  const openAlerts = getActiveAlerts(user).length
  const bellTo = `/${user.role}/notifications`

  const reset = () => {
    if (window.confirm('Reset the demo? All submitted inspections, issues and alert changes go back to the starting data.')) resetDemoData()
  }

  const handleLogout = () => {
    clear()
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="shell">
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <Brand />
        <nav className="nav" aria-label="Main">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon size={19} /> {label}
              {label === 'Alerts' && <span className="count">{openAlerts}</span>}
              {label === 'Notifications' && unread > 0 && <span className="count">{unread}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="side-user">
          <div className="who">
            <b>{user.name}</b>
            <span>{user.designation} · {user.officerId}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout}><LogOut size={16} /> Log out</button>
          <button className="reset-link" onClick={reset}>Reset demo data</button>
        </div>
      </aside>

      <div className="main">
        {/* Mobile top bar */}
        <header className="topbar">
          <Brand compact />
          <Link to={bellTo} className="bell" aria-label="Notifications">
            <Bell size={22} />
            {unread > 0 && <i>{unread}</i>}
          </Link>
        </header>
        <main className="page"><Outlet /></main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="bottom-nav" aria-label="Main">
        {bottomItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}><Icon size={21} />{label.replace(' / Projects', '')}</NavLink>
        ))}
        <button onClick={() => setMoreOpen(true)}><MoreHorizontal size={21} />More</button>
      </nav>

      {moreOpen && (
        <>
          <div className="sheet-backdrop" onClick={() => setMoreOpen(false)} />
          <div className="sheet" role="dialog" aria-label="More navigation">
            {moreItems.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} onClick={() => setMoreOpen(false)}><Icon size={20} /> {label}</NavLink>
            ))}
            <button onClick={reset}><RotateCcw size={20} /> Reset demo data</button>
            <button onClick={handleLogout}><LogOut size={20} /> Log out ({user.name})</button>
          </div>
        </>
      )}
    </div>
  )
}

function Brand({ compact }) {
  return (
    <div className="brand">
      <div className="brand-mark"><ShieldCheck size={20} /></div>
      <div>
        <div className="brand-name">Smart Inspection</div>
        {!compact && <div className="brand-sub">Field Monitoring System</div>}
      </div>
    </div>
  )
}
