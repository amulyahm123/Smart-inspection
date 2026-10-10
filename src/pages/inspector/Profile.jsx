import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useInspection } from '../../context/InspectionContext'
import { getInspectorSummary } from '../../services/dataService'
import PageHead from '../../components/ui/PageHead'

export default function Profile() {
  const { user, logout } = useAuth()
  const { clear } = useInspection()
  const navigate = useNavigate()
  const s = getInspectorSummary(user.id)
  const rows = [
    ['Officer ID', user.officerId], ['Phone', user.phone], ['Designation', user.designation],
    ['Assigned area', user.area], ['Completed inspections', s.completed.length], ['Pending inspections', s.pending.length],
  ]
  return (
    <>
      <PageHead title={user.name} subtitle="Inspector profile" />
      <div className="card" style={{ maxWidth: 520 }}>
        {rows.map(([k, v]) => (
          <div className="list-row" key={k}><span className="muted grow">{k}</span><b>{v}</b></div>
        ))}
        <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => { clear(); logout(); navigate('/login', { replace: true }) }}>
          <LogOut size={16} /> Log out
        </button>
      </div>
    </>
  )
}
