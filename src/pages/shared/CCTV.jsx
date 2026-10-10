import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Video, VideoOff, ShieldAlert, Search, BellRing } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getCameras, getSiteById, getCameraAlert, getCameraStats, triggerCameraAlert } from '../../services/dataService'
import { cameraAlertTypes } from '../../data/cameraAlertTypes'
import PageHead from '../../components/ui/PageHead'
import StatCard from '../../components/ui/StatCard'
import CameraCard from '../../components/cctv/CameraCard'
import CameraModal from '../../components/cctv/CameraModal'

// Shared by Inspector and Admin. All feeds are simulated.
export default function CCTV() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const [, setVersion] = useState(0)
  const refresh = () => setVersion((v) => v + 1)
  const [time, setTime] = useState(() => new Date())
  const [q, setQ] = useState('')
  const [siteFilter, setSiteFilter] = useState('all')
  const [stateFilter, setStateFilter] = useState('all')
  const [openId, setOpenId] = useState(params.get('camera'))
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    if (!toast) return undefined
    const t = setTimeout(() => setToast(null), 7000)
    return () => clearTimeout(t)
  }, [toast])

  const all = getCameras().map((c) => {
    const alert = getCameraAlert(c.id)
    return { ...c, site: getSiteById(c.siteId), alert, state: c.status === 'offline' ? 'offline' : alert ? 'alert' : 'live' }
  })
  const stats = getCameraStats()
  const sites = [...new Map(all.map((c) => [c.siteId, c.site])).values()]
  const rank = { alert: 0, live: 1, offline: 2 }

  const shown = all
    .filter((c) => (siteFilter === 'all' || c.siteId === siteFilter) && (stateFilter === 'all' || c.state === stateFilter) &&
      `${c.name} ${c.id} ${c.site.name} ${c.location} ${c.site.area}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => rank[a.state] - rank[b.state] || a.id.localeCompare(b.id))

  const open = (id) => { setOpenId(id); setParams(id ? { camera: id } : {}, { replace: true }) }
  const openCam = openId ? all.find((c) => c.id === openId) : null

  const simulate = () => {
    const free = all.filter((c) => c.state === 'live')
    if (free.length === 0) return setToast({ text: 'No live camera is free to simulate an alert on.' })
    const cam = free[Math.floor(Math.random() * free.length)]
    const type = cameraAlertTypes[Math.floor(Math.random() * cameraAlertTypes.length)]
    triggerCameraAlert(cam.id, type.key)
    setToast({ text: `${type.label} – ${cam.name}, ${cam.site.name}`, id: cam.id })
    refresh()
  }

  const chips = [['all', 'All', all.length], ['live', 'Live', all.filter((c) => c.state === 'live').length], ['alert', 'Alert', stats.alerts], ['offline', 'Offline', stats.offline]]

  return (
    <>
      <PageHead title="CCTV feed – Active" subtitle={`${stats.live} of ${stats.total} cameras live · simulated feeds for the prototype`}>
        <button className="btn" onClick={simulate}><ShieldAlert size={17} /> Simulate alert</button>
      </PageHead>

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <StatCard icon={Video} label="Total cameras" value={stats.total} tone="blue" />
        <StatCard icon={Video} label="Live" value={stats.live} tone="green" />
        <StatCard icon={ShieldAlert} label="Alerts detected" value={stats.alerts} tone="red" />
        <StatCard icon={VideoOff} label="Offline" value={stats.offline} tone="gray" />
      </div>

      <div className="filters">
        <input placeholder="Search camera, ID, site or location" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search cameras" />
        <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)} aria-label="Filter by site">
          <option value="all">All sites</option>
          {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div className="cat-tabs" role="tablist" aria-label="Camera status">
        {chips.map(([k, label, n]) => (
          <button key={k} role="tab" aria-selected={stateFilter === k} className={`cat-tab ${stateFilter === k ? 'on' : ''}`} onClick={() => setStateFilter(k)}>{label} ({n})</button>
        ))}
      </div>

      {shown.length === 0 && <div className="card muted"><Search size={16} /> No cameras match. Clear the search or filters.</div>}
      <div className="cam-grid">
        {shown.map((c) => <CameraCard key={c.id} cam={c} time={time} onOpen={open} />)}
      </div>

      {openCam && (
        <CameraModal cam={openCam} list={shown.some((c) => c.id === openCam.id) ? shown : [openCam]} time={time} role={user.role}
          onClose={() => open(null)} onNav={open} onChanged={refresh} />
      )}

      {toast && (
        <div className="toast" role="status">
          <b style={{ display: 'flex', gap: 6, alignItems: 'center' }}><ShieldAlert size={16} /> Alert detected</b>
          <div className="small">{toast.text}</div>
          {toast.id && <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
            <button className="toast-link" onClick={() => open(toast.id)}>Open camera</button>
            <Link className="toast-link" to={`/${user.role}/alerts`}><BellRing size={12} /> View in alerts</Link>
          </div>}
        </div>
      )}
    </>
  )
}
