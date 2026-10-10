import { useState } from 'react'
import { MapPin, Navigation, CheckCircle2, XCircle, Loader2, Smartphone, FlaskConical } from 'lucide-react'
import { demoLocation, realLocation, measure, mapOffsets } from '../../services/gpsService'
import { recordGpsFailure } from '../../services/dataService'
import { useAuth } from '../../context/AuthContext'
import Badge from '../ui/Badge'

// Used for both GPS check-in and check-out. Calls onConfirm(record) only when the inspector is inside the site radius.
export default function GpsVerifier({ site, purpose, onConfirm }) {
  const { user } = useAuth()
  const [source, setSource] = useState('demo') // demo | device
  const [placement, setPlacement] = useState('inside') // demo only: inside | outside
  const [phase, setPhase] = useState('idle') // idle | locating | done | error
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const isIn = purpose === 'checkin'

  const locate = async () => {
    setPhase('locating'); setError('')
    try {
      const loc = source === 'demo' ? await demoLocation(site, placement === 'inside') : await realLocation()
      const m = measure(site, loc)
      setResult({ loc, ...m })
      // a failed verification is kept for the risk score (it only counts if no verified check-in follows the same day)
      if (!m.within && user) recordGpsFailure({ siteId: site.id, inspectorId: user.id, purpose, distance: m.distance, radius: site.radius })
      setPhase('done')
    } catch (e) {
      setError(e.message); setPhase('error')
    }
  }

  const confirm = () => onConfirm({
    time: new Date().toISOString(), lat: result.loc.lat, lng: result.loc.lng,
    distance: result.distance, accuracy: result.loc.accuracy, source: result.loc.source, verified: true,
  })

  return (
    <div className="grid grid-2">
      <section className="card">
        <div className="card-head">
          <h2>{isIn ? 'GPS check-in' : 'GPS check-out'}</h2>
          {phase === 'done' && <Badge tone={result.within ? 'green' : 'red'}>{result.within ? 'Inside site radius' : 'Outside site radius'}</Badge>}
        </div>
        <Map site={site} result={phase === 'done' ? result : null} />
        <p className="muted small" style={{ marginTop: 8 }}>
          Site: {site.lat.toFixed(4)}, {site.lng.toFixed(4)} · permitted radius {site.radius} m
        </p>
      </section>

      <section className="card form-grid">
        <div>
          <b className="small muted">Location source</b>
          <div className="seg two" style={{ marginTop: 6 }}>
            <button className={source === 'demo' ? 'on' : ''} onClick={() => { setSource('demo'); setPhase('idle') }}><FlaskConical size={14} /> Demo GPS</button>
            <button className={source === 'device' ? 'on' : ''} onClick={() => { setSource('device'); setPhase('idle') }}><Smartphone size={14} /> My device</button>
          </div>
        </div>

        {source === 'demo' && (
          <div>
            <b className="small muted">Simulate inspector position</b>
            <div className="seg two" style={{ marginTop: 6 }}>
              <button className={placement === 'inside' ? 'on' : ''} onClick={() => { setPlacement('inside'); setPhase('idle') }}>At the site</button>
              <button className={placement === 'outside' ? 'on' : ''} onClick={() => { setPlacement('outside'); setPhase('idle') }}>Away from site</button>
            </div>
          </div>
        )}

        {phase === 'locating' && (
          <p className="muted" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Loader2 size={18} className="spin" /> {source === 'demo' ? 'Requesting location permission… (demo)' : 'Waiting for your browser’s location permission…'}
          </p>
        )}
        {phase === 'error' && <div className="warn red">{error}</div>}

        {phase === 'done' && (
          <div className={result.within ? 'ok-box' : 'warn red'}>
            <b style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {result.within ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
              {result.within ? 'Location verified' : 'You are too far from the site'}
            </b>
            <div className="small" style={{ marginTop: 4 }}>
              You are {result.distance} m from the site centre (allowed: {site.radius} m). Accuracy ±{result.loc.accuracy} m.
              {!result.within && ` Move closer and try again${source === 'device' ? ', or switch to Demo GPS to continue the demo' : ''}.`}
            </div>
          </div>
        )}

        {phase !== 'done' || !result.within ? (
          <button className="btn" onClick={locate} disabled={phase === 'locating'}>
            <Navigation size={17} /> {phase === 'done' || phase === 'error' ? 'Try again' : 'Get my location'}
          </button>
        ) : (
          <button className="btn" onClick={confirm}><MapPin size={17} /> {isIn ? 'Check in at site' : 'Check out from site'}</button>
        )}
        <p className="muted small">
          {isIn ? 'Check-in is allowed only after your GPS position is verified inside the site radius.' : 'Check-out also needs a verified position, so attendance stays GPS-linked.'}
        </p>
      </section>
    </div>
  )
}

// Small SVG map: the dashed circle is the permitted radius, the blue dot is the inspector.
function Map({ site, result }) {
  const W = 320, H = 200, cx = W / 2, cy = H / 2
  let off = { dx: 0, dy: 0 }
  if (result) off = mapOffsets(site, result.loc)
  const extent = Math.max(site.radius * 1.3, Math.hypot(off.dx, off.dy) * 1.15)
  const scale = 82 / extent
  const px = Math.min(W - 14, Math.max(14, cx + off.dx * scale))
  const py = Math.min(H - 14, Math.max(14, cy + off.dy * scale))
  return (
    <svg className="gps-map" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Site and inspector position">
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#d3dcea" strokeWidth="1" /></pattern>
      </defs>
      <rect width={W} height={H} fill="url(#grid)" />
      <circle cx={cx} cy={cy} r={site.radius * scale} fill="rgba(46,139,87,.13)" stroke="#2e8b57" strokeWidth="2" strokeDasharray="6 4" />
      <circle cx={cx} cy={cy} r="6" fill="#d9822b" />
      <text x={cx + 10} y={cy - 8} fontSize="11" fill="#14213d" fontWeight="600">Site</text>
      {result && (
        <>
          <line x1={cx} y1={cy} x2={px} y2={py} stroke="#6b7690" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx={px} cy={py} r="7" fill={result.within ? '#2563a8' : '#c0392b'} stroke="#fff" strokeWidth="2" />
          <text x={px + 10} y={py + 4} fontSize="11" fill="#14213d" fontWeight="600">You</text>
        </>
      )}
    </svg>
  )
}
