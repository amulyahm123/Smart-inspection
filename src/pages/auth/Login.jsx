import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ShieldCheck, ClipboardCheck, MapPin, Video, UserCog, LogIn } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getUsers, resetDemoData } from '../../services/dataService'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState('inspector')
  const people = getUsers().filter((u) => u.role === role)
  const [userId, setUserId] = useState(people[0].id)

  if (user) return <Navigate to={`/${user.role}`} replace />

  const pickRole = (r) => {
    setRole(r)
    setUserId(getUsers().find((u) => u.role === r).id)
  }

  const submit = (e) => {
    e.preventDefault()
    const u = login(userId)
    if (u) navigate(`/${u.role}`, { replace: true })
  }

  return (
    <div className="login">
      <section className="login-hero">
        <div>
          <div className="brand" style={{ border: 0, padding: 0 }}>
            <div className="brand-mark"><ShieldCheck size={20} /></div>
            <div><div className="brand-name">Smart Inspection</div><div className="brand-sub">Real-time monitoring &amp; inspection</div></div>
          </div>
          <h1>Verified field inspections, from site to dashboard.</h1>
          <p>One place for site checks, construction progress, CCTV feeds and issue tracking.</p>
        </div>
        <div className="login-points">
          <div><MapPin size={18} /> GPS-verified check-in and check-out</div>
          <div><ClipboardCheck size={18} /> Checklists with photo evidence</div>
          <div><Video size={18} /> Live site camera monitoring</div>
        </div>
      </section>

      <section className="login-panel">
        <form className="login-form" onSubmit={submit}>
          <div>
            <h1>Sign in</h1>
            <p className="muted">Choose how you want to enter.</p>
          </div>

          <div className="role-tabs" role="radiogroup" aria-label="Role">
            <button type="button" className={`role-tab ${role === 'inspector' ? 'on' : ''}`} onClick={() => pickRole('inspector')} role="radio" aria-checked={role === 'inspector'}>
              <ClipboardCheck size={24} /> Inspector
            </button>
            <button type="button" className={`role-tab ${role === 'admin' ? 'on' : ''}`} onClick={() => pickRole('admin')} role="radio" aria-checked={role === 'admin'}>
              <UserCog size={24} /> Admin
            </button>
          </div>

          <label>
            Demo account
            <select value={userId} onChange={(e) => setUserId(e.target.value)}>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name} – {p.officerId}</option>)}
            </select>
          </label>

          <label>
            Password
            <input type="password" value="demo1234" readOnly aria-readonly="true" />
          </label>

          <button className="btn" type="submit"><LogIn size={18} /> Sign in as {role === 'admin' ? 'Admin' : 'Inspector'}</button>
          <p className="demo-note">Demo mode: pick any account, no real password needed. Your work is saved in this browser.</p>
          <button type="button" className="reset-link dark" onClick={() => window.confirm('Reset all demo data to the starting data?') && resetDemoData()}>Reset demo data</button>
        </form>
      </section>
    </div>
  )
}
