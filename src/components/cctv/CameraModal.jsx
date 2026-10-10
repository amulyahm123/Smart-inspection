import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { X, ChevronLeft, ChevronRight, ShieldAlert, Check, BellRing } from 'lucide-react'
import SimFeed from './SimFeed'
import Badge from '../ui/Badge'
import { cameraAlertTypes } from '../../data/cameraAlertTypes'
import { triggerCameraAlert, updateAlertStatus, getUserById } from '../../services/dataService'
import { severityTone } from '../../utils/status'
import { timeAgo } from '../../utils/date'
import { alertAge } from '../../services/dataService'

// Larger view of one camera + alert controls. list = cameras currently shown (for prev/next).
export default function CameraModal({ cam, list, time, role, onClose, onNav, onChanged }) {
  const closeRef = useRef(null)
  const [typeKey, setTypeKey] = useState(cameraAlertTypes[0].key)
  const { site, state, alert } = cam
  const idx = list.findIndex((c) => c.id === cam.id)

  useEffect(() => {
    if (closeRef.current) closeRef.current.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && idx < list.length - 1) onNav(list[idx + 1].id)
      if (e.key === 'ArrowLeft' && idx > 0) onNav(list[idx - 1].id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [idx, list, onClose, onNav])

  const act = (fn) => { fn(); onChanged() }
  const officer = getUserById(site.assignedOfficer)
  const rows = [
    ['Site', site.name], ['Camera', cam.name], ['Camera ID', cam.id], ['Location', cam.location],
    ['Status', state === 'offline' ? 'Offline' : state === 'alert' ? 'Live – alert detected' : 'Live'],
    ['Last updated', state === 'offline' ? `Last signal ${timeAgo(cam.minutesAgo)}` : timeAgo(cam.minutesAgo)],
    ['Stream', 'Simulated · 1080p · 15 fps'], ['Site inspector', officer.name],
  ]

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" role="dialog" aria-label={`${cam.id} larger view`} onClick={(e) => e.stopPropagation()}>
        <div className="card-head">
          <div><h2>{cam.name}</h2><span className="muted small">{site.name} · {cam.id}</span></div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-ghost" style={{ padding: 7 }} disabled={idx <= 0} onClick={() => onNav(list[idx - 1].id)} aria-label="Previous camera"><ChevronLeft size={18} /></button>
            <button className="btn btn-ghost" style={{ padding: 7 }} disabled={idx >= list.length - 1} onClick={() => onNav(list[idx + 1].id)} aria-label="Next camera"><ChevronRight size={18} /></button>
            <button ref={closeRef} className="btn btn-ghost" style={{ padding: 7 }} onClick={onClose} aria-label="Close"><X size={18} /></button>
          </div>
        </div>

        <SimFeed camera={cam} state={state} alert={alert} time={time} large />

        {alert && (
          <div className="warn red" style={{ marginTop: 14 }}>
            <b style={{ display: 'flex', gap: 6, alignItems: 'center' }}><ShieldAlert size={17} /> {alert.type.replace('CCTV alert – ', '')}</b>
            <div className="small" style={{ margin: '4px 0 10px' }}>
              <Badge tone={severityTone[alert.severity]}>{alert.severity}</Badge> {alert.status === 'pending' ? 'Acknowledged' : 'Open'} · raised {timeAgo(alertAge(alert))}. It is listed in Ongoing / Pending Alerts.
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {alert.status === 'open' && <button className="btn btn-ghost" onClick={() => act(() => updateAlertStatus(alert.id, 'pending'))}><Check size={15} /> Acknowledge</button>}
              <button className="btn" onClick={() => act(() => updateAlertStatus(alert.id, 'resolved'))}>Resolve alert</button>
              <Link className="btn btn-ghost" to={`/${role}/alerts`}><BellRing size={15} /> View in alerts</Link>
            </div>
          </div>
        )}

        {state === 'live' && (
          <div className="sim-box">
            <b className="small">Demo: simulate a detection on this camera</b>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              <select value={typeKey} onChange={(e) => setTypeKey(e.target.value)} aria-label="Detection type" style={{ flex: '1 1 200px' }}>
                {cameraAlertTypes.map((t) => <option key={t.key} value={t.key}>{t.label} ({t.severity})</option>)}
              </select>
              <button className="btn" onClick={() => act(() => triggerCameraAlert(cam.id, typeKey))}><ShieldAlert size={16} /> Trigger alert</button>
            </div>
          </div>
        )}
        {state === 'offline' && <p className="warn" style={{ marginTop: 14 }}>This camera is offline. Check power and network at the site. Detections can’t be simulated while it is offline.</p>}

        <dl className="kv" style={{ marginTop: 16 }}>{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      </div>
    </div>
  )
}
