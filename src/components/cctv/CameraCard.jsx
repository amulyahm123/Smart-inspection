import { MapPin, Clock, Maximize2 } from 'lucide-react'
import SimFeed from './SimFeed'
import Badge from '../ui/Badge'
import { timeAgo } from '../../utils/date'

// One tile in the CCTV grid. Click the picture (or the button) for the larger view.
export default function CameraCard({ cam, time, onOpen }) {
  const { site, state, alert } = cam
  return (
    <div className={`card cam-card ${state === 'alert' ? 'cam-alert' : ''}`}>
      <button className="feed-btn" onClick={() => onOpen(cam.id)} aria-label={`Open ${cam.id} ${cam.name} in larger view`}>
        <SimFeed camera={cam} state={state} alert={alert} time={time} />
      </button>
      <div className="cam-info">
        <div className="card-head" style={{ marginBottom: 6, alignItems: 'flex-start' }}>
          <div>
            <b>{site.name}</b>
            <div className="muted small">{cam.name} · {cam.id}</div>
          </div>
          {state === 'alert' ? <Badge tone="red">Alert</Badge> : <Badge tone={state === 'live' ? 'green' : 'red'}>{state === 'live' ? 'Live' : 'Offline'}</Badge>}
        </div>
        <ul className="meta-list" style={{ margin: '0 0 8px' }}>
          <li><MapPin size={13} /> {cam.location}</li>
          <li><Clock size={13} /> {state === 'offline' ? `Last signal ${timeAgo(cam.minutesAgo)}` : `Updated ${timeAgo(cam.minutesAgo)}`}</li>
        </ul>
        {alert && state === 'alert' && <div className="small" style={{ color: 'var(--red)', fontWeight: 600 }}>{alert.detection}</div>}
        <button className="btn btn-ghost" style={{ padding: '6px 12px', marginTop: 8 }} onClick={() => onOpen(cam.id)}><Maximize2 size={14} /> Open larger view</button>
      </div>
    </div>
  )
}
