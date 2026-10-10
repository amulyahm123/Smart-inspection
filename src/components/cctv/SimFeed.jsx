import { memo } from 'react'

// A fake CCTV picture drawn with SVG: a night-time site scene with people walking past.
// Same camera id => same scene every time. No video, no streaming.
const PALETTES = [['#1b2a33', '#0b1217'], ['#1f2a22', '#0c130e'], ['#2a2530', '#120f16'], ['#262a2e', '#101214']]

function rng(id) {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return () => (h = (h * 1664525 + 1013904223) >>> 0) / 4294967296
}

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function stamp(d) {
  return `${d.toLocaleDateString('en-GB')} ${d.toLocaleTimeString('en-GB')}`
}

const Scene = memo(function Scene({ id, name, state, detection, confidence, acked, large }) {
  const uid = `${id}${large ? 'L' : 'S'}`
  const r = rng(id)
  const [top, bottom] = PALETTES[Math.floor(r() * PALETTES.length)]
  const animate = !reducedMotion()

  const buildings = Array.from({ length: 4 }, (_, i) => ({ x: i * 80 + r() * 20 - 10, w: 44 + r() * 46, h: 34 + r() * 40 }))
  const figures = Array.from({ length: 2 }, (_, i) => ({ y: 112 + i * 15 + r() * 4, s: 0.85 + i * 0.3, dur: 18 + r() * 14, begin: -(r() * 18), x: 70 + i * 120 }))
  const smoke = detection.startsWith('Smoke')

  const label = detection ? `${detection} ${confidence}%` : ''

  return (
      <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" role="img" aria-label={`${name} – simulated camera view`}>
        <defs>
          <linearGradient id={`bg${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={top} /><stop offset="1" stopColor={bottom} /></linearGradient>
          <radialGradient id={`vg${uid}`} cx="50%" cy="50%" r="70%"><stop offset="0.55" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.65" /></radialGradient>
          <filter id={`nz${uid}`}><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" /><feColorMatrix type="saturate" values="0" /></filter>
        </defs>

        {state === 'offline' ? (
          <>
            <rect width="320" height="180" fill="#14161b" />
            <rect width="320" height="180" filter={`url(#nz${uid})`} opacity="0.28" />
            <text x="160" y="92" textAnchor="middle" fill="#9aa4bd" fontSize="15" fontWeight="700" fontFamily="sans-serif">NO SIGNAL</text>
            <text x="160" y="110" textAnchor="middle" fill="#6f7a94" fontSize="8" fontFamily="sans-serif">Camera not responding</text>
          </>
        ) : (
          <>
            <rect width="320" height="180" fill={`url(#bg${uid})`} />
            <rect y="105" width="320" height="75" fill="#000" opacity="0.28" />
            {buildings.map((b, i) => (
              <g key={i}>
                <rect x={b.x} y={105 - b.h} width={b.w} height={b.h} fill="#0a0f14" opacity="0.85" />
                {Array.from({ length: Math.floor(b.h / 14) }, (_, row) => Array.from({ length: Math.floor(b.w / 14) }, (_, col) => (
                  <rect key={`${row}-${col}`} x={b.x + 5 + col * 14} y={105 - b.h + 5 + row * 14} width="6" height="7" fill="#e8d27a" opacity={r() > 0.62 ? 0.55 : 0.07} />
                )))}
              </g>
            ))}
            <line x1="0" y1="128" x2="320" y2="128" stroke="#4a5666" strokeWidth="1" opacity="0.7" />
            {Array.from({ length: 11 }, (_, i) => <line key={i} x1={i * 32 + 6} y1="118" x2={i * 32 + 6} y2="134" stroke="#4a5666" strokeWidth="1.2" opacity="0.7" />)}
            <line x1="250" y1="40" x2="250" y2="112" stroke="#586374" strokeWidth="2" />
            <circle cx="250" cy="40" r="5" fill="#fff6c8" opacity="0.8" />
            <circle cx="250" cy="40" r="16" fill="#fff6c8" opacity="0.08" />

            {figures.map((f, i) => {
              const target = detection && i === 0 && !smoke
              const w = 7 * f.s, h = 17 * f.s
              return (
                <g key={i} transform={`translate(${f.x} 0)`}>
                  {animate && <animateTransform attributeName="transform" type="translate" from="-30 0" to="350 0" dur={`${f.dur}s`} begin={`${f.begin}s`} repeatCount="indefinite" />}
                  <circle cx="0" cy={f.y - h - 2} r={3.2 * f.s} fill="#05080b" />
                  <rect x={-w / 2} y={f.y - h} width={w} height={h} rx="2" fill="#05080b" />
                  {target && (
                    <g>
                      <rect x={-w / 2 - 5} y={f.y - h - 9} width={w + 10} height={h + 13} fill="none" stroke={acked ? '#e0a82f' : '#ff4b3a'} strokeWidth="1.6" />
                      <rect x={-w / 2 - 5} y={f.y - h - 19} width={label.length * 3.7 + 6} height="10" fill={acked ? '#b07800' : '#d83a2a'} />
                      <text x={-w / 2 - 2} y={f.y - h - 11.5} fill="#fff" fontSize="6.5" fontWeight="700" fontFamily="sans-serif">{label}</text>
                    </g>
                  )}
                </g>
              )
            })}

            {smoke && (
              <g>
                {[0, 1, 2].map((i) => (
                  <circle key={i} cx={176 + i * 14} cy={96 - i * 6} r={10 + i * 4} fill="#8a8f98" opacity="0.4">
                    {animate && <animate attributeName="opacity" values="0.15;0.5;0.15" dur={`${2.4 + i * 0.6}s`} repeatCount="indefinite" />}
                  </circle>
                ))}
                <rect x="156" y="52" width="76" height="62" fill="none" stroke="#ff4b3a" strokeWidth="1.6" />
                <rect x="156" y="42" width={label.length * 3.7 + 6} height="10" fill="#d83a2a" />
                <text x="159" y="49.5" fill="#fff" fontSize="6.5" fontWeight="700" fontFamily="sans-serif">{label}</text>
              </g>
            )}

            <rect width="320" height="180" fill="#7fffd4" opacity="0.035" />
            <rect width="320" height="180" fill={`url(#vg${uid})`} />
          </>
        )}
      </svg>
  )
})

// state: 'live' | 'alert' | 'offline'.  alert: the active alert object (or null)
export default function SimFeed({ camera, state, alert, time, large = false }) {
  const acknowledged = !!alert && alert.status === 'pending'
  return (
    <div className={`feed ${state === 'alert' ? 'alert' : ''} ${state === 'offline' ? 'offline' : ''} ${large ? 'large' : ''}`}>
      <Scene id={camera.id} name={camera.name} state={state} detection={alert ? alert.detection || 'Alert' : ''}
        confidence={alert ? alert.confidence || 90 : 0} acked={acknowledged} large={large} />


      <span className={`feed-tag ${state === 'alert' ? (acknowledged ? 'ack' : 'alert') : state === 'offline' ? 'off' : ''}`}>
        {state === 'live' && <><span className="dot dot-live" /> LIVE</>}
        {state === 'alert' && <>{acknowledged ? 'ALERT · ACKNOWLEDGED' : '● ALERT DETECTED'}</>}
        {state === 'offline' && <><span className="dot dot-off" /> OFFLINE</>}
      </span>
      {state !== 'offline' && <span className="feed-rec">● REC</span>}
      <div className="feed-foot">
        <span>{camera.id} · {camera.name}</span>
        <span>{state === 'offline' ? 'No signal' : stamp(time)}</span>
      </div>
    </div>
  )
}
